// Edge Function: pagarme-create-subscription
// Cria a primeira cobrança de assinatura por cartão como pedido Pagar.me.
// A assinatura local só é registrada quando a cobrança inicial é aceita ou fica
// em processamento, evitando poluir Recorrência > Assinaturas a cada falha.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { pagarmeErrorMessage } from "../_shared/pagarme-errors.ts";
import { SUBSCRIPTION_ENTITLEMENT_STATUSES } from "../_shared/pagarme-subscription-status.ts";
import {
  buildLocalSubscriptionFromPagarme,
  pendingSubscriptionInsertRow,
  subscriptionInsertRow,
} from "../_shared/pagarme-checkout-subscription.ts";
import { planAmountBreakdownForPagarmePlan } from "../_shared/pagarme-plan-pricing.ts";

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

type PagarmeCustomer = {
  id?: string;
};

type PagarmeTransaction = {
  status?: string | null;
  success?: boolean | null;
  acquirer_message?: string | null;
  acquirer_return_code?: string | null;
  gateway_response?: unknown;
  response_code?: string | null;
  antifraud_response?: unknown;
};

type PagarmeCharge = {
  id?: string;
  status?: string | null;
  payment_method?: string | null;
  last_transaction?: PagarmeTransaction | null;
};

type PagarmeOrder = {
  id?: string;
  code?: string;
  status?: string | null;
  customer?: PagarmeCustomer | null;
  charges?: PagarmeCharge[];
};

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

function billingCycleLabel(cycle: BillingCycle) {
  return cycle === "yearly" ? "Anual" : "Mensal";
}

function checkoutCode(restaurantId: string, billingCycle: BillingCycle) {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `pubfy_${restaurantId.slice(0, 8)}_${billingCycle}_${suffix}`.slice(0, 52);
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

function buildInitialCardOrderPayload(input: {
  plan: PlanRow;
  billingCycle: BillingCycle;
  customer: CustomerInput;
  docDigits: string;
  docType: "cpf" | "cnpj";
  phoneDigits: string;
  card: ReturnType<typeof parseCardInput>;
  billingAddress: ReturnType<typeof normalizeBillingAddress>;
  restaurantId: string;
}) {
  const billing = planAmountBreakdownForPagarmePlan(input.plan, input.billingCycle);
  const cycleLabel = billingCycleLabel(input.billingCycle);
  const itemName = `${input.plan.name} (${cycleLabel})`.slice(0, 256);
  const areaCode = input.phoneDigits.slice(0, 2);
  const phoneNumber = input.phoneDigits.slice(2);

  return {
    code: checkoutCode(input.restaurantId, input.billingCycle),
    closed: true,
    items: [
      {
        amount: billing.amount_cents,
        description: itemName,
        quantity: 1,
        code: String(input.plan.id).slice(0, 52),
      },
    ],
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      document: input.docDigits,
      document_type: input.docType,
      type: input.docType === "cnpj" ? "company" : "individual",
      address: input.billingAddress,
      phones: {
        mobile_phone: {
          country_code: "55",
          area_code: areaCode,
          number: phoneNumber,
        },
      },
    },
    billing: {
      name: input.customer.name,
      address: input.billingAddress,
    },
    payments: [
      {
        payment_method: "credit_card",
        credit_card: {
          installments: 1,
          statement_descriptor: "PUBFY",
          card: {
            ...input.card,
            holder_document: input.docDigits,
          },
        },
      },
    ],
    metadata: {
      source: "pubfy_platform_subscription",
      integration_model: "initial_card_order",
      restaurant_id: input.restaurantId,
      plan_id: input.plan.id,
      billing_cycle: input.billingCycle,
      catalog_amount_cents: billing.catalog_amount_cents,
    },
  };
}

function primaryCreditCardCharge(order: PagarmeOrder): PagarmeCharge | null {
  return order.charges?.find((charge) => charge.payment_method === "credit_card") ??
    order.charges?.[0] ??
    null;
}

function normalizePaymentStatus(order: PagarmeOrder): string {
  const charge = primaryCreditCardCharge(order);
  return String(charge?.status ?? order.status ?? "").toLowerCase();
}

function localStatusFromCardOrder(status: string): "active" | "pending" | "canceled" {
  if (status === "paid" || status === "captured" || status === "authorized") return "active";
  if (status === "pending" || status === "processing") return "pending";
  return "canceled";
}

function paymentDiagnostics(order: PagarmeOrder) {
  const charge = primaryCreditCardCharge(order);
  const tx = charge?.last_transaction ?? null;
  if (!charge && !tx) return null;

  return {
    order_status: order.status ?? null,
    charge_id: charge?.id ?? null,
    charge_status: charge?.status ?? null,
    transaction_status: tx?.status ?? null,
    transaction_success: tx?.success ?? null,
    acquirer_message: tx?.acquirer_message ?? null,
    acquirer_return_code: tx?.acquirer_return_code ?? null,
    response_code: tx?.response_code ?? null,
    gateway_response: tx?.gateway_response ?? null,
    antifraud_response: tx?.antifraud_response ?? null,
  };
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
    // 3) Primeira cobrança por cartão como pedido Pagar.me. Isso valida/cobra o
    // cartão sem criar uma nova assinatura remota para cada tentativa recusada.
    const docDigits = digits(body.customer.document);
    const docType =
      body.customer.document_type ||
      (docDigits.length === 14 ? "cnpj" : "cpf");
    const phoneDigits = digits(body.customer.phone);
    const card = parseCardInput(body.card);
    const billingAddress = normalizeBillingAddress(body.billing_address);

    const order = await pagarme<PagarmeOrder>(
      "/orders",
      "POST",
      buildInitialCardOrderPayload({
        plan,
        billingCycle: body.billing_cycle,
        customer: body.customer,
        docDigits,
        docType,
        phoneDigits,
        card,
        billingAddress,
        restaurantId: restaurant.id,
      }),
    );
    if (!order.id) throw new Error("Pagar.me order response missing id");

    const now = new Date();

    const { data: priorSub } = await admin
      .from("subscriptions")
      .select("status, is_trial, current_period_end, trial_ends_at")
      .eq("restaurant_id", restaurant.id)
      .in("status", [...SUBSCRIPTION_ENTITLEMENT_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paymentStatus = normalizePaymentStatus(order);
    const mappedOrderStatus = localStatusFromCardOrder(paymentStatus);
    const customerId = order.customer?.id ?? null;
    const diagnostics = paymentDiagnostics(order);

    if (mappedOrderStatus === "canceled") {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Pagamento não confirmado no Pagar.me (${paymentStatus || "failed"}). ` +
            "Nenhuma assinatura local foi criada e nenhuma assinatura recorrente foi criada no Pagar.me. " +
            "Confira os dados do cartão, o simulador ativo na conta de teste ou tente outro método.",
          pagarme_order_id: order.id,
          pagarme_customer_id: customerId,
          pagarme_status: paymentStatus || null,
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
        id: order.id,
        status: mappedOrderStatus === "active" ? "active" : "pending",
        start_at: now.toISOString(),
      },
      billingCycle: body.billing_cycle,
      paymentMethod: "credit_card",
      planTrialDays: plan.trial_days,
      priorEntitlement: priorSub,
    });

    if (localSub.status === "pending") {
      const pendingRow = pendingSubscriptionInsertRow(localSub, priorSub);
      const { data: insertedPending, error: pendingInsertErr } = await admin
        .from("subscriptions")
        .insert({
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          ...pendingRow,
          pagarme_subscription_id: order.id,
          pagarme_customer_id: customerId,
          last_payment_status: paymentStatus || "pending",
        })
        .select()
        .single();

      if (pendingInsertErr) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Pagamento em processamento no Pagar.me, mas a tentativa local não pôde ser registrada. " +
              `Detalhe: ${pendingInsertErr.message}`,
            pagarme_order_id: order.id,
            pagarme_customer_id: customerId,
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
            order_id: order.id,
            customer_id: customerId,
            status: paymentStatus || "pending",
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
        p_pagarme_subscription_id: order.id,
        p_pagarme_customer_id: customerId,
        p_last_payment_status: paymentStatus || "paid",
        p_last_payment_at: now.toISOString(),
      },
    );

    if (insertErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Pagamento aprovado no Pagar.me, mas a assinatura local não pôde ser registrada. " +
            `Detalhe: ${insertErr.message}`,
          pagarme_order_id: order.id,
          pagarme_customer_id: customerId,
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
          pagarme_order_id: order.id,
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
          order_id: order.id,
          customer_id: customerId,
          status: paymentStatus || "paid",
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
