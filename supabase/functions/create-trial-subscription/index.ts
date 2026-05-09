import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Plan = {
  id: string;
  name: string;
  trial_days: number | null;
  price_monthly: number | null;
};

type Restaurant = {
  id: string;
  owner_id: string;
  created_at?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

function chooseTrialPlan(plans: Plan[]) {
  const preferredNames = ["Plano Pubfy", "Profissional", "Básico"];
  return [...plans].sort((a, b) => {
    const aPreferred = preferredNames.indexOf(a.name);
    const bPreferred = preferredNames.indexOf(b.name);
    const aRank = aPreferred === -1 ? 99 : aPreferred;
    const bRank = bPreferred === -1 ? 99 : bPreferred;
    if (aRank !== bRank) return aRank - bRank;
    return Number(a.price_monthly || 0) - Number(b.price_monthly || 0);
  })[0];
}

function trialWindow(anchor: string | null | undefined, trialDays: number) {
  const parsedAnchor = anchor ? Date.parse(anchor) : NaN;
  const trialStart = Number.isFinite(parsedAnchor) ? new Date(parsedAnchor) : new Date();
  const trialEndsAt = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

  return {
    trialStart,
    trialEndsAt,
    status: trialEndsAt.getTime() >= Date.now() ? "trialing" : "canceled",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const user = await getUser(req, supabase);
    if (!user) return json({ success: false, error: "Usuário não autenticado" }, 401);

    const { restaurant_id } = await req.json();
    if (!restaurant_id) return json({ success: false, error: "Restaurante obrigatório" }, 400);

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, owner_id, created_at")
      .eq("id", restaurant_id)
      .maybeSingle() as { data: Restaurant | null; error: Error | null };

    if (restaurantError) throw restaurantError;
    if (!restaurant || restaurant.owner_id !== user.id) {
      return json({ success: false, error: "Sem permissão para criar trial deste restaurante" }, 403);
    }

    const { data: existingSubscription, error: existingError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingSubscription) {
      return json({ success: true, subscription: existingSubscription, already_exists: true });
    }

    const { data: plans, error: planError } = await supabase
      .from("plans")
      .select("id, name, trial_days, price_monthly")
      .eq("is_active", true);

    if (planError) throw planError;
    const plan = chooseTrialPlan((plans ?? []) as Plan[]);
    if (!plan) return json({ success: false, error: "Nenhum plano ativo encontrado" }, 400);

    const trialDays = Math.max(1, Number(plan.trial_days || 14));
    const { trialStart, trialEndsAt, status } = trialWindow(restaurant.created_at, trialDays);

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        restaurant_id,
        plan_id: plan.id,
        status,
        is_trial: true,
        billing_cycle: "monthly",
        start_date: trialStart.toISOString(),
        trial_start: trialStart.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_start: trialStart.toISOString(),
        current_period_end: trialEndsAt.toISOString(),
        end_date: status === "canceled" ? trialEndsAt.toISOString() : null,
      })
      .select("*")
      .single();

    if (subscriptionError) throw subscriptionError;

    return json({ success: true, subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("create-trial-subscription error:", message);
    await captureEdgeException(error, {
      functionName: "create-trial-subscription",
      req,
    });
    return json({ success: false, error: "Erro ao criar trial" }, 500);
  }
});
