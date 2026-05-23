// Edge Function: pagarme-update-subscription
// Permite trocar o plano (cycle), cancelar ou sincronizar pagamento pendente.
// Ações suportadas: change_plan | cancel | sync_payment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  computeRemainingCreditMs,
  resolvePaidSubscriptionPeriod,
  type BillingCycle,
  type PriorEntitlement,
} from "../_shared/pagarme-checkout-subscription.ts";
import { supersedePriorSubscriptions } from "../_shared/pagarme-subscription-status.ts";
import {
  isPagarmeSubscriptionExternalId,
  isPlatformOrderExternalId,
  localStatusFromOrderCharge,
  primaryOrderChargeStatus,
} from "../_shared/pagarme-platform-order.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

type PagarmeErrorPayload = {
  message?: string;
  errors?: Array<{ message?: string }>;
  raw?: string;
};

type SubscriptionWithRestaurant = {
  id: string;
  restaurant_id: string;
  plan_id: string;
  pagarme_subscription_id: string | null;
  billing_cycle: string | null;
  status: string;
  is_trial?: boolean | null;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  restaurants?: { owner_id?: string | null } | null;
};

type PagarmeOrder = {
  id?: string;
  charges?: Array<{ status?: string | null }> | null;
};

type PagarmeSubscriptionRemote = {
  status?: string | null;
};

async function applyPaidLocalPeriod(
  admin: ReturnType<typeof createClient>,
  sub: SubscriptionWithRestaurant,
  update: Record<string, unknown>,
) {
  const now = new Date();
  const billingCycle: BillingCycle = sub.billing_cycle === "yearly" ? "yearly" : "monthly";
  const periodStart = sub.status === "pending"
    ? now
    : sub.current_period_start
      ? new Date(sub.current_period_start)
      : now;
  const prior: PriorEntitlement = {
    status: sub.status,
    is_trial: sub.is_trial ?? null,
    current_period_end: sub.current_period_end ?? null,
    trial_ends_at: sub.trial_ends_at ?? null,
  };
  const { periodEnd, nextBilling } = resolvePaidSubscriptionPeriod({
    billingCycle,
    periodStart,
    remainingCreditMs: computeRemainingCreditMs(now, prior),
  });
  update.status = "active";
  update.last_payment_at = now.toISOString();
  update.is_trial = false;
  update.trial_start = null;
  update.trial_ends_at = null;
  update.billing_cycle = billingCycle;
  update.current_period_start = periodStart.toISOString();
  update.current_period_end = periodEnd.toISOString();
  update.next_billing_at = nextBilling.toISOString();
}

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pagarmeErrorMessage(data: unknown, status: number) {
  const payload = isRecord(data) ? data as PagarmeErrorPayload : null;
  return payload?.message || payload?.errors?.[0]?.message || `HTTP ${status}`;
}

async function pagarme<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = pagarmeErrorMessage(data, res.status);
    throw new Error(`Pagar.me ${method} ${path}: ${msg}`);
  }
  return data as T;
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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

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
    const { data: subData, error: subErr } = await admin
      .from("subscriptions")
      .select(
        "id, restaurant_id, plan_id, pagarme_subscription_id, billing_cycle, status, is_trial, trial_ends_at, current_period_start, current_period_end, restaurants:restaurant_id(owner_id)",
      )
      .eq("id", subscription_id)
      .maybeSingle();

    if (subErr || !subData) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sub = subData as SubscriptionWithRestaurant;
    const isOwner = sub.restaurants?.owner_id === userId;
    const { data: isAdmin } = await admin.rpc("is_super_admin", { user_id: userId });
    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "sync_payment") {
      if (sub.status !== "pending") {
        return new Response(JSON.stringify({ success: true, subscription: sub, unchanged: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const externalId = sub.pagarme_subscription_id;
      if (!externalId) {
        return new Response(JSON.stringify({ error: "Subscription has no Pagar.me ID" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (isPlatformOrderExternalId(externalId)) {
        const order = await pagarme<PagarmeOrder>(`/orders/${externalId}`, "GET");
        const chargeStatus = primaryOrderChargeStatus(order);
        update.last_payment_status = chargeStatus || null;
        const mapped = localStatusFromOrderCharge(chargeStatus);
        if (mapped === "canceled") {
          update.status = "canceled";
          update.end_date = new Date().toISOString();
        } else if (mapped === "active") {
          await applyPaidLocalPeriod(admin, sub, update);
        }
      } else if (isPagarmeSubscriptionExternalId(externalId)) {
        const remote = await pagarme<PagarmeSubscriptionRemote>(
          `/subscriptions/${externalId}`,
          "GET",
        );
        const remoteStatus = (remote.status ?? "").toLowerCase();
        update.last_payment_status = remoteStatus || null;
        if (remoteStatus === "active" || remoteStatus === "paid") {
          await applyPaidLocalPeriod(admin, sub, update);
        } else if (remoteStatus === "canceled" || remoteStatus === "failed") {
          update.status = "canceled";
          update.end_date = new Date().toISOString();
        }
      } else {
        return new Response(JSON.stringify({ error: "Unsupported Pagar.me reference" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!update.status) {
        return new Response(JSON.stringify({ success: true, subscription: sub, unchanged: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: updateErr } = await admin
        .from("subscriptions")
        .update(update)
        .eq("id", sub.id)
        .select()
        .single();
      if (updateErr) throw new Error(updateErr.message);

      if (update.status === "active") {
        await supersedePriorSubscriptions(admin, sub.restaurant_id, sub.id);
      }

      return new Response(JSON.stringify({ success: true, subscription: updated }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      const externalId = sub.pagarme_subscription_id;
      if (externalId && isPagarmeSubscriptionExternalId(externalId)) {
        await pagarme<unknown>(`/subscriptions/${externalId}`, "DELETE");
      }
      const now = new Date();
      const periodEndCandidates = [
        sub.current_period_end,
        sub.next_billing_at,
        sub.trial_ends_at,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()));
      const accessUntil = periodEndCandidates.reduce(
        (latest, date) => (date.getTime() > latest.getTime() ? date : latest),
        now,
      );
      const endDate = accessUntil.getTime() > now.getTime() ? accessUntil : now;
      const { data: updated } = await admin
        .from("subscriptions")
        .update({
          status: "canceled",
          end_date: endDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", sub.id)
        .select()
        .single();
      return new Response(JSON.stringify({ success: true, subscription: updated }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sub.pagarme_subscription_id) {
      return new Response(JSON.stringify({ error: "Subscription has no Pagar.me ID" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      const result = await pagarme<{ next_billing_at?: string | null }>(
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
