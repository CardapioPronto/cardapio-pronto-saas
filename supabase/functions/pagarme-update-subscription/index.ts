// Edge Function: pagarme-update-subscription
// Permite trocar o plano (cycle) ou cancelar uma assinatura existente.
// Ações suportadas: change_plan | cancel
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

async function pagarme(path: string, method: string, body?: unknown) {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.message || data?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`Pagar.me ${method} ${path}: ${msg}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeaderValue = req.headers.get("Authorization");
    if (!authHeaderValue?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeaderValue } } },
    );
    const token = authHeaderValue.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { action, subscription_id, billing_cycle } = await req.json();
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "subscription_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Carrega a subscription e valida ownership
    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("id, restaurant_id, plan_id, pagarme_subscription_id, billing_cycle, status, restaurants:restaurant_id(owner_id)")
      .eq("id", subscription_id)
      .maybeSingle();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isOwner = (sub as any).restaurants?.owner_id === userId;
    const { data: isAdmin } = await admin.rpc("is_super_admin", { user_id: userId });
    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sub.pagarme_subscription_id) {
      return new Response(JSON.stringify({ error: "Subscription has no Pagar.me ID" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      await pagarme(`/subscriptions/${sub.pagarme_subscription_id}`, "DELETE");
      const { data: updated } = await admin
        .from("subscriptions")
        .update({ status: "canceled", end_date: new Date().toISOString() })
        .eq("id", sub.id)
        .select()
        .single();
      return new Response(JSON.stringify({ success: true, subscription: updated }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change_plan") {
      if (billing_cycle !== "monthly" && billing_cycle !== "yearly") {
        return new Response(JSON.stringify({ error: "billing_cycle must be monthly or yearly" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: plan } = await admin
        .from("plans")
        .select("id, pagarme_plan_id_monthly, pagarme_plan_id_yearly, is_active")
        .eq("id", sub.plan_id)
        .maybeSingle();
      if (!plan?.is_active) {
        return new Response(JSON.stringify({ error: "Plan inactive" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newPagarmePlanId = billing_cycle === "monthly"
        ? plan.pagarme_plan_id_monthly
        : plan.pagarme_plan_id_yearly;
      if (!newPagarmePlanId) {
        return new Response(JSON.stringify({ error: "Plan not synced for this cycle" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await pagarme(
        `/subscriptions/${sub.pagarme_subscription_id}/plan`,
        "PATCH",
        { plan_id: newPagarmePlanId },
      );
      const { data: updated } = await admin
        .from("subscriptions")
        .update({
          billing_cycle,
          next_billing_at: result?.next_billing_at ?? undefined,
        })
        .eq("id", sub.id)
        .select()
        .single();
      return new Response(JSON.stringify({ success: true, subscription: updated }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});