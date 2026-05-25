// Edge Function: pagarme-sync-plan
// Cria/atualiza os planos (mensal e anual) no Pagar.me a partir de um plano local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { pagarmeErrorMessage } from "../_shared/pagarme-errors.ts";
import { planAmountBreakdownForPagarmePlan } from "../_shared/pagarme-plan-pricing.ts";

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
  name?: string;
  status?: string;
  currency?: string;
  interval?: string;
  interval_count?: number;
  trial_period_days?: number | null;
  items?: Array<{
    id?: string;
    name?: string;
    status?: string;
    pricing_scheme?: { price?: number; scheme_type?: string };
  }>;
};

type PagarmeRequestData = PagarmePlanResponse | { raw: string } | null;

type PagarmePlanListResponse = {
  data?: PagarmePlanResponse[];
};

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

function amountCentsForInterval(plan: LocalPlan, interval: "month" | "year") {
  const billingCycle = interval === "month" ? "monthly" : "yearly";
  return planAmountBreakdownForPagarmePlan(plan, billingCycle).amount_cents;
}

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

function planDisplayName(plan: LocalPlan, interval: "month" | "year") {
  const suffix = interval === "month" ? "Mensal" : "Anual";
  return `${plan.name} ${suffix}`;
}

function buildPlanBase(
  plan: LocalPlan,
  interval: "month" | "year",
  amountCents: number,
  name = planDisplayName(plan, interval),
) {
  return {
    name,
    status: "active",
    currency: "BRL",
    description:
      plan.description ||
      `Assinatura ${interval === "month" ? "mensal" : "anual"} do Pubfy`,
    interval,
    interval_count: 1,
    billing_type: "prepaid",
    payment_methods: normalizePlanPaymentMethodsForPagarme(plan.pagarme_payment_methods),
    installments: interval === "year"
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [1],
    minimum_price: amountCents,
    statement_descriptor: "PUBFY",
    // Trial é só local. O Pagar.me rejeita trial_period_days=0; omitir o campo
    // evita que novas assinaturas nasçam como "Futura" por trial remoto.
  };
}

function buildPlanCreateBody(
  plan: LocalPlan,
  interval: "month" | "year",
  amountCents: number,
  name?: string,
) {
  const {
    status: _status,
    ...base
  } = buildPlanBase(plan, interval, amountCents, name);
  return {
    ...base,
    items: [
      {
        name: base.name,
        quantity: 1,
        pricing_scheme: { price: amountCents, scheme_type: "unit" },
      },
    ],
  };
}

function replacementPlanName(displayName: string) {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 12);
  const suffix = ` ${stamp}`;
  return `${displayName.slice(0, 64 - suffix.length)}${suffix}`;
}

/** PUT exige name, status, currency, interval e interval_count (doc Pagar.me v5). */
function buildPlanUpdateBody(
  plan: LocalPlan,
  interval: "month" | "year",
  amountCents: number,
  remotePlan: PagarmePlanResponse | null,
) {
  const base = buildPlanBase(plan, interval, amountCents);
  const remoteItems = remotePlan?.items ?? [];
  if (remoteItems.length === 0) {
    return base;
  }
  return {
    ...base,
    items: remoteItems.map((item) => ({
      id: item.id,
      name: item.name ?? base.name,
      status: item.status ?? "active",
      quantity: 1,
      pricing_scheme: {
        price: amountCents,
        scheme_type: item.pricing_scheme?.scheme_type ?? "unit",
      },
    })),
  };
}

function extractPlanList(data: PagarmeRequestData): PagarmePlanResponse[] {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data)) return data as PagarmePlanResponse[];
  const payload = data as PagarmePlanListResponse;
  return Array.isArray(payload.data) ? payload.data : [];
}

async function findPagarmePlanByName(planName: string): Promise<string | null> {
  const res = await pagarmeRequest("/plans?page=1&size=100", "GET");
  if (!res.ok) return null;
  const match = extractPlanList(res.data).find((p) => p.name === planName);
  return match?.id ?? null;
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

type UpsertPlanResult = {
  id: string;
  linkedOnly?: boolean;
  warning?: string;
};

async function upsertPagarmePlan(
  plan: LocalPlan,
  interval: "month" | "year",
  existingId: string | null,
): Promise<UpsertPlanResult> {
  const amountCents = amountCentsForInterval(plan, interval);
  const displayName = planDisplayName(plan, interval);
  let planId = existingId;

  const createPlan = async (reason?: string): Promise<UpsertPlanResult> => {
    const name = reason ? replacementPlanName(displayName) : displayName;
    const created = await pagarmeRequest(
      "/plans",
      "POST",
      buildPlanCreateBody(plan, interval, amountCents, name),
    );
    if (!created.ok) {
      throw new Error(
        `Pagar.me create failed (${created.status}): ${pagarmeErrorMessage(created.data, created.status)}`,
      );
    }
    const createdId = getPagarmePlanId(created.data);
    if (!createdId) throw new Error("Pagar.me create response missing id");
    return {
      id: createdId,
      warning: reason ? `${displayName}: novo plano Pagar.me criado (${reason}).` : undefined,
    };
  };

  if (planId) {
    const remote = await pagarmeRequest(`/plans/${planId}`, "GET");
    if (!remote.ok && remote.status === 404) {
      planId = null;
    } else if (remote.ok) {
      const remotePlan = remote.data as PagarmePlanResponse;
      const remoteTrialDays = Number(remotePlan.trial_period_days ?? 0);
      if (remoteTrialDays > 0) {
        return createPlan(`plano remoto tinha trial_period_days=${remoteTrialDays}`);
      }
      const updateBody = buildPlanUpdateBody(plan, interval, amountCents, remotePlan);
      const updated = await pagarmeRequest(`/plans/${planId}`, "PUT", updateBody);
      if (updated.ok) {
        return { id: planId };
      }
      // Planos já vinculados podem não aceitar alterações de preço, itens ou trial.
      // Para novos checkouts é mais seguro criar um novo plano e manter assinaturas antigas no ID anterior.
      if (updated.status === 400 || updated.status === 422 || updated.status === 403) {
        return createPlan(
          `atualização recusada pelo Pagar.me: ${pagarmeErrorMessage(updated.data, updated.status)}`,
        );
      }
      throw new Error(
        `Pagar.me update failed: ${pagarmeErrorMessage(updated.data, updated.status)}`,
      );
    }
  }

  if (!planId) {
    planId = await findPagarmePlanByName(displayName);
    if (planId) {
      return upsertPagarmePlan(plan, interval, planId);
    }
  }

  return createPlan();
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
      const monthly = await upsertPagarmePlan(
        plan as LocalPlan,
        "month",
        plan.pagarme_plan_id_monthly,
      );
      const yearly = await upsertPagarmePlan(
        plan as LocalPlan,
        "year",
        plan.pagarme_plan_id_yearly,
      );

      const warnings = [monthly.warning, yearly.warning].filter(Boolean);
      const syncNote = warnings.length > 0 ? warnings.join(" ") : null;

      const { error: updErr } = await admin
        .from("plans")
        .update({
          pagarme_plan_id_monthly: monthly.id,
          pagarme_plan_id_yearly: yearly.id,
          pagarme_synced_at: new Date().toISOString(),
          pagarme_sync_status: "synced",
          pagarme_sync_error: syncNote,
        })
        .eq("id", plan_id);

      if (updErr) throw new Error(`DB update failed: ${updErr.message}`);

      return new Response(
        JSON.stringify({
          success: true,
          pagarme_plan_id_monthly: monthly.id,
          pagarme_plan_id_yearly: yearly.id,
          linked_only: Boolean(monthly.linkedOnly || yearly.linkedOnly),
          warning: syncNote,
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
