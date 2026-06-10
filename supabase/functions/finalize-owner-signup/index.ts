import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_VERIFICATION_TTL_HOURS = 24;

type SupabaseAdmin = ReturnType<typeof createClient>;

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  confirmed_at?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

type Plan = {
  id: string;
  name: string;
  trial_days: number | null;
  price_monthly: number | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanUrl(value: unknown) {
  const url = cleanText(value, 2048);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

function isEmailConfirmed(user: AuthUser) {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

function verificationDeadline(user: AuthUser, metadata: Record<string, unknown>) {
  const explicitDeadline = cleanText(metadata.verification_expires_at, 80);
  if (explicitDeadline) return Date.parse(explicitDeadline);

  const createdAt = user.created_at ? Date.parse(user.created_at) : Date.now();
  return createdAt + DEFAULT_VERIFICATION_TTL_HOURS * 60 * 60 * 1000;
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
    status: trialDays > 0 && trialEndsAt.getTime() > Date.now() ? "trialing" : "canceled",
  };
}

async function getUser(req: Request, supabase: SupabaseAdmin): Promise<AuthUser | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) throw error;
  return (data.user ?? null) as AuthUser | null;
}

async function cleanupOwnerSignup(supabase: SupabaseAdmin, userId: string) {
  const { data: restaurants, error: restaurantSelectError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId);

  if (restaurantSelectError) throw restaurantSelectError;

  const restaurantIds = (restaurants ?? [])
    .map((restaurant: { id?: string }) => restaurant.id)
    .filter(Boolean) as string[];

  if (restaurantIds.length > 0) {
    const { error: subscriptionDeleteError } = await supabase
      .from("subscriptions")
      .delete()
      .in("restaurant_id", restaurantIds);
    if (subscriptionDeleteError) throw subscriptionDeleteError;

    const { error: restaurantDeleteError } = await supabase
      .from("restaurants")
      .delete()
      .in("id", restaurantIds);
    if (restaurantDeleteError) throw restaurantDeleteError;
  }

  const { error: profileDeleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);
  if (profileDeleteError) throw profileDeleteError;

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
  if (authDeleteError) throw authDeleteError;
}

async function ensureTrialSubscription(supabase: SupabaseAdmin, restaurantId: string) {
  const { data: existingSubscription, error: existingError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingSubscription) return existingSubscription;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("created_at")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restaurantError) throw restaurantError;

  const { data: plans, error: planError } = await supabase
    .from("plans")
    .select("id, name, trial_days, price_monthly")
    .eq("is_active", true);

  if (planError) throw planError;
  const plan = chooseTrialPlan((plans ?? []) as Plan[]);
  if (!plan) throw new Error("Nenhum plano ativo encontrado");

  const trialDays = Math.min(365, Math.max(0, Number(plan.trial_days ?? 14)));
  const { trialStart, trialEndsAt, status } = trialWindow(
    typeof restaurant?.created_at === "string" ? restaurant.created_at : null,
    trialDays,
  );

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      restaurant_id: restaurantId,
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
  return subscription;
}

async function finalizeMetadata(supabase: SupabaseAdmin, user: AuthUser) {
  const nextMetadata = { ...(user.user_metadata ?? {}) };
  nextMetadata.signup_intent = "owner_signup_completed";
  nextMetadata.verification_completed_at = new Date().toISOString();
  delete nextMetadata.pending_restaurant;
  delete nextMetadata.verification_expires_at;

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
  });
  if (error) throw error;
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

    const metadata = user.user_metadata ?? {};
    if (metadata.signup_intent !== "owner_signup") {
      return json({ success: true, finalized: false });
    }

    if (!isEmailConfirmed(user)) {
      return json({ success: false, error: "E-mail ainda não confirmado" }, 403);
    }

    const deadline = verificationDeadline(user, metadata);
    if (!Number.isFinite(deadline) || Date.now() > deadline) {
      await cleanupOwnerSignup(supabase, user.id);
      return json({
        success: false,
        expired: true,
        error: "Prazo de confirmação expirado. Faça um novo cadastro.",
      });
    }

    const pendingRestaurant = asRecord(metadata.pending_restaurant);
    const restaurantName = cleanText(pendingRestaurant.name, 100);
    const ownerName = cleanText(metadata.name, 100) || user.email || "Usuário";
    const userEmail = cleanText(user.email, 254);

    if (!restaurantName) {
      return json({ success: false, error: "Dados do estabelecimento incompletos" }, 400);
    }

    if (!userEmail) {
      return json({ success: false, error: "E-mail do dono não encontrado" }, 400);
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, restaurant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    let restaurantId = profile?.restaurant_id as string | null;

    if (!restaurantId) {
      const { data: existingRestaurant, error: existingRestaurantError } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existingRestaurantError) throw existingRestaurantError;
      restaurantId = existingRestaurant?.id ?? null;
    }

    if (!restaurantId) {
      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          name: restaurantName,
          owner_id: user.id,
          phone: cleanText(pendingRestaurant.phone, 20),
          address: cleanText(pendingRestaurant.address, 200),
          cnpj: cleanText(pendingRestaurant.cnpj, 18),
          logo_url: cleanUrl(pendingRestaurant.logo_url),
          category: cleanText(pendingRestaurant.category, 50),
          email: userEmail,
        })
        .select("id")
        .single();

      if (restaurantError) throw restaurantError;
      restaurantId = restaurant.id as string;
    }

    const { error: upsertUserError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: userEmail,
        name: ownerName,
        restaurant_id: restaurantId,
        role: "restaurant_owner",
        user_type: "owner",
      }, { onConflict: "id" });

    if (upsertUserError) throw upsertUserError;

    await ensureTrialSubscription(supabase, restaurantId);

    const referralCode = cleanText(metadata.referral_code, 32);
    const referralFirstClickAt = cleanText(metadata.referral_first_click_at, 40);
    if (referralCode) {
      const { data: attribution, error: attributionError } = await supabase.rpc(
        "attribute_restaurant_referral",
        {
          p_restaurant_id: restaurantId,
          p_referral_code: referralCode,
          p_first_click_at: referralFirstClickAt || new Date().toISOString(),
        },
      );
      if (attributionError) {
        console.warn("attribute_restaurant_referral:", attributionError.message);
      } else if (attribution && typeof attribution === "object") {
        const result = attribution as { attributed?: boolean; reason?: string };
        if (result.attributed === false && result.reason) {
          console.info("referral not attributed:", result.reason);
        }
      }
    }

    await finalizeMetadata(supabase, user);

    return json({
      success: true,
      finalized: true,
      restaurant_id: restaurantId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("finalize-owner-signup error:", message);
    await captureEdgeException(error, {
      functionName: "finalize-owner-signup",
      req,
    });
    return json({ success: false, error: "Erro ao finalizar cadastro do dono" }, 500);
  }
});
