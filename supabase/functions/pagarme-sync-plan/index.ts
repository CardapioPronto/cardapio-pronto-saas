// Edge Function: pagarme-sync-plan
// Cria/atualiza os planos (mensal e anual) no Pagar.me a partir de um plano local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

interface LocalPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  trial_days: number;
  is_active: boolean;
  pagarme_payment_methods: string[] | null;
  pagarme_plan_id_monthly: string | null;
  pagarme_plan_id_yearly: string | null;
}

type PagarmePlanResponse = {
  id?: string;
};

type PagarmeRequestData = PagarmePlanResponse | { raw: string } | null;

const DEFAULT_PAYMENT_METHODS = ["credit_card", "boleto"];

/** Métodos aceitos na API de *planos* do Pagar.me (assinaturas). PIX não entra aqui. */
const PAGARME_PLAN_API_METHODS = new Set([
  "credit_card",
  "boleto",
  "debit_card",
]);

function normalizePlanPaymentMethodsForPagarme(methods: string[] | null | undefined) {
  const validMethods = (methods ?? DEFAULT_PAYMENT_METHODS).filter((method) =>
    PAGARME_PLAN_API_METHODS.has(method)
  );

  return validMethods.length > 0 ? validMethods : DEFAULT_PAYMENT_METHODS;
}

type PagarmeErrorPayload = {
  message?: string;
  errors?: Array<{ message?: string; field?: string }>;
  raw?: string;
};

function pagarmeErrorMessage(data: PagarmeRequestData, status: number) {
  if (data && typeof data === "object") {
    const payload = data as PagarmeErrorPayload;
    const detail = payload.errors?.[0]?.message;
    if (detail) return detail;
    if (payload.message) return payload.message;
    if (payload.raw) return payload.raw.slice(0, 400);
  }
  return `Pagar.me retornou HTTP ${status}`;
}

function amountCentsForInterval(plan: LocalPlan, interval: "month" | "year") {
  const amount = interval === "month"
    ? Number(plan.price_monthly)
    : Number(plan.price_yearly) * 12;
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(cents) || cents < 100) {
    const label = interval === "month" ? "mensal" : "anual (12x)";
    throw new Error(
      `Preço ${label} deve ser de pelo menos R$ 1,00 para sincronizar no Pagar.me. Valor atual: R$ ${amount}`,
    );
  }
  return cents;
}

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

function buildPlanBody(
  plan: LocalPlan,
  interval: "month" | "year",
  amountCents: number,
) {
  const suffix = interval === "month" ? "Mensal" : "Anual";
  return {
    name: `${plan.name} ${suffix}`,
    description:
      plan.description ||
      `Assinatura ${interval === "month" ? "mensal" : "anual"} do Pubfy`,
    interval,
    interval_count: 1,
    billing_type: "prepaid",
    payment_methods: normalizePlanPaymentMethodsForPagarme(plan.pagarme_payment_methods),
    installments: [1],
    minimum_price: amountCents,
    trial_period_days: plan.trial_days || 0,
    items: [
      {
        name: `${plan.name} ${suffix}`,
        quantity: 1,
        pricing_scheme: { price: amountCents, scheme_type: "unit" },
      },
    ],
    statement_descriptor: "PUBFY",
  };
}

async function pagarmeRequest(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: PagarmeRequestData }> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: PagarmeRequestData = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function getPagarmePlanId(data: PagarmeRequestData) {
  return data && "id" in data && typeof data.id === "string" ? data.id : null;
}

async function upsertPagarmePlan(
  plan: LocalPlan,
  interval: "month" | "year",
  existingId: string | null,
) {
  const amountCents = amountCentsForInterval(plan, interval);
  const body = buildPlanBody(plan, interval, amountCents);

  if (existingId) {
    const res = await pagarmeRequest(`/plans/${existingId}`, "PUT", body);
    if (!res.ok) {
      // se o plano não existir mais no Pagar.me (404), recria
      if (res.status === 404) {
        const created = await pagarmeRequest("/plans", "POST", body);
        if (!created.ok) {
          throw new Error(
            `Pagar.me create failed: ${pagarmeErrorMessage(created.data, created.status)}`,
          );
        }
        const createdId = getPagarmePlanId(created.data);
        if (!createdId) throw new Error("Pagar.me create response missing id");
        return createdId;
      }
      throw new Error(
        `Pagar.me update failed: ${pagarmeErrorMessage(res.data, res.status)}`,
      );
    }
    return existingId;
  }

  const created = await pagarmeRequest("/plans", "POST", body);
  if (!created.ok) {
    throw new Error(
      `Pagar.me create failed (${created.status}): ${pagarmeErrorMessage(created.data, created.status)}`,
    );
  }
  const createdId = getPagarmePlanId(created.data);
  if (!createdId) throw new Error("Pagar.me create response missing id");
  return createdId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeaderValue = req.headers.get("Authorization");
    if (!authHeaderValue?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeaderValue } } },
    );

    const token = authHeaderValue.replace("Bearer ", "");
    const { data: userData, error: userErr } =
      await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Verifica super admin
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.rpc("is_super_admin", {
      user_id: userId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: "plan_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();

    if (planErr) {
      return new Response(
        JSON.stringify({
          error: "Failed to load local plan",
          details: planErr.message,
          plan_id,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!plan) {
      return new Response(JSON.stringify({ error: "Plan not found", plan_id }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const monthlyId = await upsertPagarmePlan(
        plan as LocalPlan,
        "month",
        plan.pagarme_plan_id_monthly,
      );
      const yearlyId = await upsertPagarmePlan(
        plan as LocalPlan,
        "year",
        plan.pagarme_plan_id_yearly,
      );

      const { error: updErr } = await admin
        .from("plans")
        .update({
          pagarme_plan_id_monthly: monthlyId,
          pagarme_plan_id_yearly: yearlyId,
          pagarme_synced_at: new Date().toISOString(),
          pagarme_sync_status: "synced",
          pagarme_sync_error: null,
        })
        .eq("id", plan_id);

      if (updErr) throw new Error(`DB update failed: ${updErr.message}`);

      return new Response(
        JSON.stringify({
          success: true,
          pagarme_plan_id_monthly: monthlyId,
          pagarme_plan_id_yearly: yearlyId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      await admin
        .from("plans")
        .update({
          pagarme_sync_status: "error",
          pagarme_sync_error: msg.substring(0, 500),
        })
        .eq("id", plan_id);
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
