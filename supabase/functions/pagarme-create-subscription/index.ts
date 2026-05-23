// Edge Function: pagarme-create-subscription
// Checkout com cartão: customer + card + subscription no Pagar.me (sub_*).
// Tentativas recusadas não gravam assinatura local; pendentes antigas são canceladas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { pagarmeErrorMessage } from "../_shared/pagarme-errors.ts";
import {
  buildCustomerPayload,
  buildCardPayload,
  createCardPlatformSubscription,
  resolveCardCheckoutPaymentStatus,
  subscriptionPaymentDiagnostics,
} from "../_shared/pagarme-card-subscription-checkout.ts";
import { SUBSCRIPTION_ENTITLEMENT_STATUSES } from "../_shared/pagarme-subscription-status.ts";
import {
  buildLocalSubscriptionFromPagarme,
  pagarmeSubscriptionStartAt,
  pendingSubscriptionInsertRow,
  subscriptionInsertRow,
} from "../_shared/pagarme-checkout-subscription.ts";
import {
  planAmountBreakdownForCardCheckout,
  type PlanAmountBreakdown,
} from "../_shared/pagarme-plan-pricing.ts";
import { pagarmePlanIdForCycle } from "../_shared/pagarme-recurring-subscription.ts";
import { isPagarmeSubscriptionExternalId } from "../_shared/pagarme-platform-order.ts";

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
  document: string;
  document_type?: "cpf" | "cnpj";
  phone: string;
}

interface BillingAddressInput {
  zip_code: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface RequestBody {
  local_plan_id: string;
  billing_cycle: BillingCycle;
  customer: CustomerInput;
  card: CardInput;
  billing_address?: BillingAddressInput;
}

type PlanRow = {
  id: string;
  name: string;
  is_active: boolean;
  trial_days: number | null;
  price_monthly: number | null;
  price_yearly: number | null;
  pagarme_plan_id_monthly: string | null;
  pagarme_plan_id_yearly: string | null;
  pagarme_sync_error: string | null;
};

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

function isPagarmeTestKey() {
  return Deno.env.get("PAGARME_SECRET_KEY")?.startsWith("sk_test") ?? false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function digits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function parseCardInput(card: CardInput) {
  const number = digits(card.number);
  const expMonth = Number(card.exp_month);
  const rawExpYear = Number(card.exp_year);
  const expYear = rawExpYear < 100 ? 2000 + rawExpYear : rawExpYear;
  const cvv = digits(String(card.cvv));

  if (number.length < 13) throw new Error("Número do cartão inválido.");
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
    throw new Error("Mês de validade do cartão inválido.");
  }
  if (!Number.isInteger(expYear) || expYear < new Date().getFullYear()) {
    throw new Error("Ano de validade do cartão inválido.");
  }
  if (cvv.length < 3) throw new Error("CVV do cartão inválido.");

  return {
    number,
    holder_name: card.holder_name,
    exp_month: expMonth,
    exp_year: expYear,
    cvv,
  };
}

function normalizeBillingAddress(input?: BillingAddressInput) {
  const zipCode = digits(input?.zip_code ?? "");
  const street = String(input?.street ?? "").trim();
  const number = String(input?.number ?? "").trim();
  const complement = String(input?.complement ?? "").trim();
  const neighborhood = String(input?.neighborhood ?? "").trim();
  const city = String(input?.city ?? "").trim();
  const state = String(input?.state ?? "").trim().toUpperCase().slice(0, 2);

  if (
    zipCode.length === 8 &&
    street.length >= 3 &&
    number &&
    neighborhood.length >= 2 &&
    city.length >= 2 &&
    /^[A-Z]{2}$/.test(state)
  ) {
    return {
      country: "BR",
      state,
      city,
      zip_code: zipCode,
      line_1: `${number}, ${street}, ${neighborhood}`.slice(0, 256),
      ...(complement ? { line_2: complement.slice(0, 128) } : {}),
    };
  }

  if (isPagarmeTestKey()) {
    return {
      country: "BR",
      state: "SP",
      city: "Sao Paulo",
      zip_code: "01311000",
      line_1: "1000, Avenida Paulista, Bela Vista",
      line_2: "Endereco de homologacao Pubfy",
    };
  }

  throw new Error("Endereço de cobrança é obrigatório para pagamento com cartão.");
}

function formatCardDeclinedError(
  paymentStatus: string,
  billing: PlanAmountBreakdown,
  diagnostics: Record<string, unknown> | null,
): string {
  const acquirer = typeof diagnostics?.acquirer_message === "string"
    ? diagnostics.acquirer_message.trim()
    : "";
  const homologNote = isPagarmeTestKey()
    ? " Homologação: cartão 4000000000000010, validade 12/30, CVV 123; nome no cartão só letras."
    : "";
  const amountNote =
    ` Plano: R$ ${billing.catalog_amount_reais.toFixed(2)} (${billing.catalog_amount_cents} centavos).`;
  const acquirerNote = acquirer ? ` Motivo: ${acquirer}.` : "";
  return (
    `Pagamento não confirmado no Pagar.me (${paymentStatus || "failed"}).` +
    " Nenhuma assinatura foi ativada." +
    homologNote +
    amountNote +
    acquirerNote
  );
}

async function cancelStalePendingCheckoutAttempts(
  admin: ReturnType<typeof createClient>,
  restaurantId: string,
) {
  const { data: staleRows } = await admin
    .from("subscriptions")
    .select("id, pagarme_subscription_id")
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending");

  const now = new Date().toISOString();
  for (const row of staleRows ?? []) {
    const externalId = row.pagarme_subscription_id;
    if (externalId && isPagarmeSubscriptionExternalId(externalId)) {
      try {
        await pagarme(`/subscriptions/${encodeURIComponent(externalId)}`, "DELETE");
      } catch (err) {
        console.warn("[pagarme-create-subscription] cancel stale remote sub:", err);
      }
    }
    await admin
      .from("subscriptions")
      .update({ status: "canceled", end_date: now, updated_at: now })
      .eq("id", row.id);
  }
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
  const phoneDigits = digits(String(customer.phone));
  if (phoneDigits.length < 10) {
    throw new Error("Telefone inválido (informe DDD + número).");
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

    let restaurantQuery = admin
      .from("restaurants")
      .select("id, name, owner_id");

    restaurantQuery = profile?.restaurant_id
      ? restaurantQuery.eq("id", profile.restaurant_id)
      : restaurantQuery.eq("owner_id", userId);

    const { data: restaurant, error: restErr } = await restaurantQuery.maybeSingle();

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

    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select(
        "id, name, is_active, trial_days, price_monthly, price_yearly, pagarme_plan_id_monthly, pagarme_plan_id_yearly, pagarme_sync_error",
      )
      .eq("id", body.local_plan_id)
      .maybeSingle<PlanRow>();
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

    const pagarmePlanId = pagarmePlanIdForCycle(plan, body.billing_cycle);
    if (!pagarmePlanId) {
      return new Response(JSON.stringify({
        error: `Plan is not synced with Pagar.me (${body.billing_cycle}). Sync from Super Admin first.`,
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const docDigits = digits(body.customer.document);
    const docType =
      body.customer.document_type ||
      (docDigits.length === 14 ? "cnpj" : "cpf");
    const phoneDigits = digits(body.customer.phone);
    const card = parseCardInput(body.card);
    const billingAddress = normalizeBillingAddress(body.billing_address);
    const billingAmount = planAmountBreakdownForCardCheckout(plan, body.billing_cycle);

    await cancelStalePendingCheckoutAttempts(admin, restaurant.id);

    const { data: priorSub } = await admin
      .from("subscriptions")
      .select("status, is_trial, trial_start, current_period_start, current_period_end, trial_ends_at")
      .eq("restaurant_id", restaurant.id)
      .in("status", [...SUBSCRIPTION_ENTITLEMENT_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscriptionStartAt = pagarmeSubscriptionStartAt(new Date(), priorSub);

    const checkout = await createCardPlatformSubscription(pagarme, {
      pagarmePlanId,
      billingCycle: body.billing_cycle,
      restaurantId: restaurant.id,
      planId: plan.id,
      startAt: subscriptionStartAt,
      customer: buildCustomerPayload({
        name: body.customer.name,
        email: body.customer.email,
        docDigits,
        docType,
        phoneDigits,
        address: billingAddress,
      }),
      card: buildCardPayload(card, billingAddress),
    });

    const remoteStatus = checkout.subscription.status ?? "failed";
    const mappedStatus = resolveCardCheckoutPaymentStatus(checkout.subscription);
    const diagnostics = subscriptionPaymentDiagnostics(checkout.subscription);
    const now = new Date();

    if (mappedStatus === "canceled") {
      return new Response(
        JSON.stringify({
          success: false,
          error: formatCardDeclinedError(remoteStatus, billingAmount, diagnostics),
          billing_amount: billingAmount,
          pagarme_subscription_id: checkout.subscription.id ?? null,
          pagarme_customer_id: checkout.customerId,
          pagarme_status: remoteStatus,
          payment_diagnostics: diagnostics,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const localSub = buildLocalSubscriptionFromPagarme({
      pagarme: {
        ...checkout.subscription,
        status: mappedStatus === "active"
          ? "active"
          : mappedStatus === "pending"
            ? "pending"
            : "failed",
      },
      billingCycle: body.billing_cycle,
      paymentMethod: "credit_card",
      planTrialDays: plan.trial_days,
      priorEntitlement: priorSub,
    });

    if (mappedStatus === "pending") {
      const pendingRow = pendingSubscriptionInsertRow(localSub, priorSub);
      const { data: insertedPending, error: pendingInsertErr } = await admin
        .from("subscriptions")
        .insert({
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          ...pendingRow,
          pagarme_subscription_id: checkout.subscription.id,
          pagarme_customer_id: checkout.customerId,
          last_payment_status: remoteStatus || "pending",
        })
        .select()
        .single();

      if (pendingInsertErr) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Assinatura criada no Pagar.me em processamento, mas o registro local falhou. " +
              `Detalhe: ${pendingInsertErr.message}`,
            pagarme_subscription_id: checkout.subscription.id,
            pagarme_customer_id: checkout.customerId,
            payment_diagnostics: diagnostics,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscription: insertedPending,
          period_credit_days: localSub.period_credit_days ?? 0,
          pagarme: {
            subscription_id: checkout.subscription.id,
            customer_id: checkout.customerId,
            status: remoteStatus || "pending",
            payment_method: "credit_card",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        p_pagarme_subscription_id: checkout.subscription.id,
        p_pagarme_customer_id: checkout.customerId,
        p_last_payment_status: remoteStatus || "paid",
        p_last_payment_at: now.toISOString(),
      },
    );

    if (insertErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Assinatura ativa no Pagar.me, mas o registro local falhou. " +
            `Detalhe: ${insertErr.message}`,
          pagarme_subscription_id: checkout.subscription.id,
          pagarme_customer_id: checkout.customerId,
          payment_diagnostics: diagnostics,
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
        metadata: {
          source: "pagarme_create_subscription",
          billing_cycle: body.billing_cycle,
          payment_method: "credit_card",
          pagarme_subscription_id: checkout.subscription.id,
        },
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
          subscription_id: checkout.subscription.id,
          customer_id: checkout.customerId,
          status: remoteStatus || "active",
          payment_method: "credit_card",
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
