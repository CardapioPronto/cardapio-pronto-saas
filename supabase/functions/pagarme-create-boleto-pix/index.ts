// Edge Function: pagarme-create-boleto-pix
// Cria customer + subscription no Pagar.me com boleto ou PIX
// a partir de um plano local sincronizado, e persiste em `subscriptions`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { SUBSCRIPTION_STATUSES_TO_SUPERSEDE } from "../_shared/pagarme-subscription-status.ts";
import {
  buildLocalSubscriptionFromPagarme,
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
type PaymentMethod = "boleto" | "pix";

interface CustomerInput {
  name: string;
  email: string;
  document: string;
  document_type?: "cpf" | "cnpj";
  phone: string;
}

interface RequestBody {
  local_plan_id: string;
  billing_cycle: BillingCycle;
  payment_method: PaymentMethod;
  customer: CustomerInput;
}

type PagarmeErrorPayload = {
  message?: string;
  errors?: Array<{ message?: string }>;
  raw?: string;
};

type PagarmeCustomer = {
  id?: string;
};

type PagarmeTransaction = {
  url?: string | null;
  pdf?: string | null;
  barcode?: string | null;
  line?: string | null;
  due_at?: string | null;
  qr_code?: string | null;
  qrcode?: string | null;
  qr_code_url?: string | null;
  qrcode_url?: string | null;
  expires_at?: string | null;
};

type PagarmeCharge = {
  last_transaction?: PagarmeTransaction | null;
};

type PagarmeSubscription = PagarmeSubscriptionPayload & {
  current_cycle?: { charges?: PagarmeCharge[] } | null;
  invoices?: Array<{ charges?: PagarmeCharge[] }> | null;
};

type PagarmeOrder = {
  id?: string;
  charges?: PagarmeCharge[] | null;
};

const PLATFORM_SUBSCRIPTION_SOURCE = "pubfy_platform_subscription";

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
  const fieldError = payload?.errors?.map((e) => e.message).filter(Boolean).join("; ");
  return fieldError || payload?.message || `HTTP ${status}`;
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

const digits = (s: string) => (s || "").replace(/\D/g, "");

function validateBody(b: unknown): RequestBody {
  if (!isRecord(b)) throw new Error("Invalid body");
  const customer = isRecord(b.customer) ? b.customer : null;
  if (!b.local_plan_id) throw new Error("local_plan_id is required");
  if (b.billing_cycle !== "monthly" && b.billing_cycle !== "yearly") {
    throw new Error("billing_cycle must be monthly or yearly");
  }
  if (b.payment_method !== "boleto" && b.payment_method !== "pix") {
    throw new Error("payment_method must be boleto or pix");
  }
  if (!customer?.name || !customer.email || !customer.document || !customer.phone) {
    throw new Error("customer fields are required");
  }
  return b as RequestBody;
}

function buildSubscriptionPayload(pagarmePlanId: string, customerId: string) {
  return {
    plan_id: pagarmePlanId,
    customer_id: customerId,
    payment_method: "boleto",
    boleto_due_days: 3,
  };
}

function planAmountCents(
  plan: { price_monthly: number; price_yearly: number },
  billingCycle: BillingCycle,
) {
  const amount = billingCycle === "monthly"
    ? Number(plan.price_monthly)
    : Number(plan.price_yearly) * 12;
  return Math.round(amount * 100);
}

function hasPaymentPayload(info: Record<string, unknown>) {
  return Object.values(info).some((value) => value != null && value !== "");
}

function extractPixPaymentInfo(tx: PagarmeTransaction | null | undefined) {
  if (!tx) return {};
  return {
    pix_qr_code: tx.qr_code ?? tx.qrcode ?? null,
    pix_qr_code_url: tx.qr_code_url ?? tx.qrcode_url ?? null,
    pix_expires_at: tx.expires_at ?? null,
  };
}

function extractPaymentInfo(
  subscription: PagarmeSubscription,
  paymentMethod: PaymentMethod,
): Record<string, unknown> {
  const charge = subscription.current_cycle?.charges?.[0]
    ?? subscription.invoices?.[0]?.charges?.[0]
    ?? null;
  const tx = charge?.last_transaction ?? null;
  if (!tx) return {};

  if (paymentMethod === "boleto") {
    return {
      boleto_url: tx.url ?? tx.pdf ?? null,
      boleto_barcode: tx.barcode ?? null,
      boleto_line: tx.line ?? null,
      due_at: tx.due_at ?? null,
    };
  }

  return extractPixPaymentInfo(tx);
}

function extractOrderPaymentInfo(order: PagarmeOrder, paymentMethod: PaymentMethod) {
  const tx = order.charges?.[0]?.last_transaction ?? null;
  if (paymentMethod === "pix") return extractPixPaymentInfo(tx);
  return {};
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
      return new Response(JSON.stringify({ error: "Restaurant not found for user" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (restaurant.owner_id !== userId && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only the restaurant owner can subscribe" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("id, name, is_active, trial_days, pagarme_plan_id_monthly, pagarme_plan_id_yearly")
      .eq("id", body.local_plan_id)
      .maybeSingle();
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!plan.is_active) {
      return new Response(JSON.stringify({ error: "Plan is inactive" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pagarmePlanId = body.billing_cycle === "monthly"
      ? plan.pagarme_plan_id_monthly
      : plan.pagarme_plan_id_yearly;
    if (!pagarmePlanId) {
      return new Response(JSON.stringify({
        error: `Plan is not synced with Pagar.me (${body.billing_cycle}). Sync from Super Admin first.`,
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const docDigits = digits(body.customer.document);
    const docType = body.customer.document_type || (docDigits.length === 14 ? "cnpj" : "cpf");
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

    const now = new Date();

    const { data: priorSub } = await admin
      .from("subscriptions")
      .select("status, is_trial, current_period_end, trial_ends_at")
      .eq("restaurant_id", restaurant.id)
      .in("status", [...SUBSCRIPTION_STATUSES_TO_SUPERSEDE])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (body.payment_method === "pix") {
      const amountCents = planAmountCents(plan, body.billing_cycle);
      if (amountCents < 100) {
        throw new Error("Valor do plano inválido para cobrança PIX (mínimo R$ 1,00).");
      }

      const localSub = buildLocalSubscriptionFromPagarme({
        pagarme: { status: "pending" },
        billingCycle: body.billing_cycle,
        paymentMethod: "pix",
        planTrialDays: plan.trial_days,
        priorEntitlement: priorSub,
      });

      await admin
        .from("subscriptions")
        .update({ status: "canceled", end_date: now.toISOString() })
        .eq("restaurant_id", restaurant.id)
        .in("status", [...SUBSCRIPTION_STATUSES_TO_SUPERSEDE]);

      const { data: inserted, error: insertErr } = await admin
        .from("subscriptions")
        .insert({
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          ...localSub,
          pagarme_customer_id: customer.id,
        })
        .select()
        .single();

      if (insertErr) {
        throw new Error(`Falha ao registrar assinatura local: ${insertErr.message}`);
      }

      const cycleLabel = body.billing_cycle === "monthly" ? "Mensal" : "Anual";
      const order = await pagarme<PagarmeOrder>("/orders", "POST", {
        code: `pubfy_sub_${inserted.id}`.slice(0, 52),
        closed: true,
        items: [{
          amount: amountCents,
          description: `${plan.name} (${cycleLabel})`,
          quantity: 1,
          code: plan.id,
        }],
        customer_id: customer.id,
        payments: [{
          payment_method: "pix",
          pix: { expires_in: 3600 },
        }],
        metadata: {
          source: PLATFORM_SUBSCRIPTION_SOURCE,
          subscription_id: inserted.id,
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          billing_cycle: body.billing_cycle,
        },
      });

      if (!order.id) throw new Error("Pagar.me order response missing id");

      await admin
        .from("subscriptions")
        .update({ pagarme_subscription_id: order.id })
        .eq("id", inserted.id);

      let paymentInfo = extractOrderPaymentInfo(order, "pix");
      if (!hasPaymentPayload(paymentInfo)) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const refreshed = await pagarme<PagarmeOrder>(`/orders/${order.id}`, "GET");
        paymentInfo = extractOrderPaymentInfo(refreshed, "pix");
      }

      const subscriptionRow = { ...inserted, pagarme_subscription_id: order.id };

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
            source: "pagarme_create_boleto_pix",
            billing_cycle: body.billing_cycle,
            payment_method: "pix",
            pagarme_order_id: order.id,
          },
        });
      } catch (emailError) {
        console.error("Failed to send subscription email:", emailError);
      }

      return new Response(JSON.stringify({
        success: true,
        subscription: subscriptionRow,
        period_credit_days: localSub.period_credit_days ?? 0,
        payment: paymentInfo,
        pagarme: {
          order_id: order.id,
          customer_id: customer.id,
          status: "pending",
          payment_method: "pix",
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const created = await pagarme<PagarmeSubscription>(
      "/subscriptions",
      "POST",
      buildSubscriptionPayload(pagarmePlanId, customer.id),
    );
    if (!created.id) throw new Error("Pagar.me subscription response missing id");

    const subscription = await pagarme<PagarmeSubscription>(
      `/subscriptions/${created.id}`,
      "GET",
    );

    const now = new Date();

    const localSub = buildLocalSubscriptionFromPagarme({
      pagarme: subscription,
      billingCycle: body.billing_cycle,
      paymentMethod: body.payment_method,
      planTrialDays: plan.trial_days,
      priorEntitlement: priorSub,
    });

    await admin
      .from("subscriptions")
      .update({ status: "canceled", end_date: now.toISOString() })
      .eq("restaurant_id", restaurant.id)
      .in("status", [...SUBSCRIPTION_STATUSES_TO_SUPERSEDE]);

    const { data: inserted, error: insertErr } = await admin
      .from("subscriptions")
      .insert({
        restaurant_id: restaurant.id,
        plan_id: plan.id,
        ...localSub,
        pagarme_subscription_id: subscription.id ?? created.id,
        pagarme_customer_id: customer.id,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({
        success: false,
        error: `Subscription created on Pagar.me but DB insert failed: ${insertErr.message}`,
        pagarme_subscription_id: subscription.id,
        pagarme_customer_id: customer.id,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
          source: "pagarme_create_boleto_pix",
          billing_cycle: body.billing_cycle,
          payment_method: body.payment_method,
        },
      });
    } catch (emailError) {
      console.error("Failed to send subscription email:", emailError);
    }

    let paymentInfo = extractPaymentInfo(subscription, body.payment_method);

    if (!hasPaymentPayload(paymentInfo) && subscription.id) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const refreshed = await pagarme<PagarmeSubscription>(
        `/subscriptions/${subscription.id}`,
        "GET",
      );
      paymentInfo = extractPaymentInfo(refreshed, body.payment_method);
    }

    return new Response(JSON.stringify({
      success: true,
      subscription: inserted,
      period_credit_days: localSub.period_credit_days ?? 0,
      payment: paymentInfo,
      pagarme: {
        subscription_id: subscription.id,
        customer_id: customer.id,
        status: subscription.status,
        payment_method: body.payment_method,
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
