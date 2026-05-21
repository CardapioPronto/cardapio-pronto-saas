// Edge Function: pagarme-create-subscription
// Cria customer + card + subscription no Pagar.me a partir de um plano local
// sincronizado, e persiste a assinatura na tabela `subscriptions`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { SUBSCRIPTION_ENTITLEMENT_STATUSES } from "../_shared/pagarme-subscription-status.ts";
import {
  buildLocalSubscriptionFromPagarme,
  subscriptionInsertRow,
  type PagarmeSubscriptionPayload,
} from "../_shared/pagarme-checkout-subscription.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

type BillingCycle = "monthly" | "yearly";

interface CardInput {
  number: string;
  holder_name: string;
  exp_month: number | string;
  exp_year: number | string;
  cvv: string;
}

interface CustomerInput {
  name: string;
  email: string;
  document: string; // CPF/CNPJ - apenas dígitos
  document_type?: "cpf" | "cnpj";
  phone: string; // apenas dígitos com DDD, ex: 11999998888
}

interface RequestBody {
  local_plan_id: string;
  billing_cycle: BillingCycle;
  customer: CustomerInput;
  card: CardInput;
}

type PagarmeErrorPayload = {
  message?: string;
  errors?: Array<{ message?: string }>;
  raw?: string;
};

type PagarmeCustomer = {
  id?: string;
};

type PagarmeCard = {
  id?: string;
};

type PagarmeSubscription = PagarmeSubscriptionPayload;

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
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = pagarmeErrorMessage(data, res.status);
    throw new Error(`Pagar.me ${method} ${path}: ${msg}`);
  }
  return data as T;
}

async function cancelPagarmeSubscriptionSafe(subscriptionId: string | undefined, reason: string) {
  if (!subscriptionId) return false;
  try {
    await pagarme<unknown>(`/subscriptions/${subscriptionId}`, "DELETE");
    return true;
  } catch (error) {
    console.error(`Failed to cancel Pagar.me subscription after ${reason}:`, error);
    return false;
  }
}

function digits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function validateBody(b: unknown): RequestBody {
  if (!isRecord(b)) throw new Error("Invalid body");
  const customer = isRecord(b.customer) ? b.customer : null;
  const card = isRecord(b.card) ? b.card : null;
  if (!b.local_plan_id) throw new Error("local_plan_id is required");
  if (b.billing_cycle !== "monthly" && b.billing_cycle !== "yearly") {
    throw new Error("billing_cycle must be monthly or yearly");
  }
  if (!customer?.name || !customer.email || !customer.document || !customer.phone) {
    throw new Error("customer fields are required");
  }
  if (
    !card?.number ||
    !card.holder_name ||
    !card.exp_month ||
    !card.exp_year ||
    !card.cvv
  ) {
    throw new Error("card fields are required");
  }
  return b as RequestBody;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = validateBody(await req.json());

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("users")
      .select("id, restaurant_id, role, user_type")
      .eq("id", userId)
      .maybeSingle();

    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { user_id: userId });

    // 1) Restaurante do usuário. O painel usa users.restaurant_id; manter a
    // mesma fonte evita que super admins/testes fiquem sem vínculo de cobrança.
    let restaurantQuery = admin
      .from("restaurants")
      .select("id, name, owner_id");

    restaurantQuery = profile?.restaurant_id
      ? restaurantQuery.eq("id", profile.restaurant_id)
      : restaurantQuery.eq("owner_id", userId);

    const { data: restaurant, error: restErr } = await restaurantQuery
      .maybeSingle();

    if (restErr || !restaurant) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found for user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (restaurant.owner_id !== userId && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only the restaurant owner can subscribe" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Plano local + IDs Pagar.me
    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select(
        "id, name, is_active, trial_days, pagarme_plan_id_monthly, pagarme_plan_id_yearly",
      )
      .eq("id", body.local_plan_id)
      .maybeSingle();
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!plan.is_active) {
      return new Response(JSON.stringify({ error: "Plan is inactive" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pagarmePlanId =
      body.billing_cycle === "monthly"
        ? plan.pagarme_plan_id_monthly
        : plan.pagarme_plan_id_yearly;
    if (!pagarmePlanId) {
      return new Response(
        JSON.stringify({
          error: `Plan is not synced with Pagar.me (${body.billing_cycle}). Sync from Super Admin first.`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Customer Pagar.me
    const docDigits = digits(body.customer.document);
    const docType =
      body.customer.document_type ||
      (docDigits.length === 14 ? "cnpj" : "cpf");
    const phoneDigits = digits(body.customer.phone);
    const areaCode = phoneDigits.slice(0, 2);
    const phoneNumber = phoneDigits.slice(2);

    const customer = await pagarme<PagarmeCustomer>("/customers", "POST", {
      name: body.customer.name,
      email: body.customer.email,
      document: docDigits,
      document_type: docType,
      type: docType === "cnpj" ? "company" : "individual",
      phones: {
        mobile_phone: {
          country_code: "55",
          area_code: areaCode,
          number: phoneNumber,
        },
      },
    });
    if (!customer.id) throw new Error("Pagar.me customer response missing id");

    // 4) Card
    const card = await pagarme<PagarmeCard>(`/customers/${customer.id}/cards`, "POST", {
      number: digits(body.card.number),
      holder_name: body.card.holder_name,
      exp_month: Number(body.card.exp_month),
      exp_year: Number(body.card.exp_year) < 100 ? 2000 + Number(body.card.exp_year) : Number(body.card.exp_year),
      cvv: String(body.card.cvv),
    });
    if (!card.id) throw new Error("Pagar.me card response missing id");

    // 5) Subscription
    const created = await pagarme<PagarmeSubscription>("/subscriptions", "POST", {
      plan_id: pagarmePlanId,
      customer_id: customer.id,
      card_id: card.id,
      payment_method: "credit_card",
      installments: 1,
    });
    if (!created.id) throw new Error("Pagar.me subscription response missing id");

    const subscription = await pagarme<PagarmeSubscription>(
      `/subscriptions/${created.id}`,
      "GET",
    );

    const now = new Date();

    const { data: priorSub } = await admin
      .from("subscriptions")
      .select("status, is_trial, current_period_end, trial_ends_at")
      .eq("restaurant_id", restaurant.id)
      .in("status", [...SUBSCRIPTION_ENTITLEMENT_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const localSub = buildLocalSubscriptionFromPagarme({
      pagarme: subscription,
      billingCycle: body.billing_cycle,
      paymentMethod: "credit_card",
      planTrialDays: plan.trial_days,
      priorEntitlement: priorSub,
    });
    const remoteStatus = (subscription.status ?? created.status ?? "").toLowerCase();
    const pagarmeSubscriptionId = subscription.id ?? created.id;

    if (localSub.status !== "active") {
      const cleanupDone = await cancelPagarmeSubscriptionSafe(
        pagarmeSubscriptionId,
        `non-active checkout status ${remoteStatus || localSub.status}`,
      );

      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Pagamento não confirmado no Pagar.me (${remoteStatus || localSub.status}). ` +
            "Nenhuma alteração foi feita na assinatura atual. Confira os dados do cartão ou tente outro método.",
          pagarme_subscription_id: pagarmeSubscriptionId,
          pagarme_customer_id: customer.id,
          pagarme_status: remoteStatus || null,
          cleanup_done: cleanupDone,
        }),
        {
          status: remoteStatus === "failed" || remoteStatus === "unpaid" || remoteStatus === "past_due"
            ? 402
            : 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const insertRow = subscriptionInsertRow(localSub);
    const { data: inserted, error: insertErr } = await admin.rpc(
      "insert_paid_checkout_subscription",
      {
        p_restaurant_id: restaurant.id,
        p_plan_id: plan.id,
        p_status: insertRow.status,
        p_is_trial: insertRow.is_trial,
        p_trial_start: insertRow.trial_start,
        p_trial_ends_at: insertRow.trial_ends_at,
        p_billing_cycle: insertRow.billing_cycle,
        p_start_date: insertRow.start_date,
        p_current_period_start: insertRow.current_period_start,
        p_current_period_end: insertRow.current_period_end,
        p_next_billing_at: insertRow.next_billing_at,
        p_pagarme_subscription_id: pagarmeSubscriptionId,
        p_pagarme_customer_id: customer.id,
        p_last_payment_status: subscription.status ?? "active",
        p_last_payment_at: now.toISOString(),
      },
    );

    if (insertErr) {
      const cleanupDone = await cancelPagarmeSubscriptionSafe(
        pagarmeSubscriptionId,
        `DB insert failure: ${insertErr.message}`,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Pagamento aprovado no Pagar.me, mas a assinatura local não pôde ser registrada. " +
            `A assinatura criada no Pagar.me ${cleanupDone ? "foi cancelada" : "precisa ser cancelada manualmente"} para evitar duplicidade. ` +
            `Detalhe: ${insertErr.message}`,
          pagarme_subscription_id: pagarmeSubscriptionId,
          pagarme_customer_id: customer.id,
          cleanup_done: cleanupDone,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      await sendManagedEmail({
        admin,
        restaurantId: restaurant.id,
        templateKey: "subscription_created",
        emailType: "transactional",
        to: body.customer.email,
        recipientName: body.customer.name,
        contextType: "subscription",
        contextId: inserted.id,
        variables: {
          customer_name: body.customer.name,
          plan_name: plan.name,
          status: localSub.status,
        },
        metadata: { source: "pagarme_create_subscription", billing_cycle: body.billing_cycle },
      });
    } catch (emailError) {
      console.error("Failed to send subscription email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: inserted,
        period_credit_days: localSub.period_credit_days ?? 0,
        pagarme: {
          subscription_id: subscription.id,
          customer_id: customer.id,
          card_id: card.id,
          status: subscription.status,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
