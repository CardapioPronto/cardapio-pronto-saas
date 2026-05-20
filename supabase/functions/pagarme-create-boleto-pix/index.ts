// Edge Function: pagarme-create-boleto-pix
// Cria customer + subscription no Pagar.me com boleto ou PIX
// a partir de um plano local sincronizado, e persiste em `subscriptions`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import {
  mapPagarmeSubscriptionStatus,
  SUBSCRIPTION_STATUSES_TO_SUPERSEDE,
} from "../_shared/pagarme-subscription-status.ts";

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

type PagarmeSubscription = {
  id?: string;
  status?: string;
  next_billing_at?: string | null;
  current_period_end?: string | null;
  current_cycle?: { charges?: PagarmeCharge[] } | null;
  invoices?: Array<{ charges?: PagarmeCharge[] }> | null;
};

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

function buildSubscriptionPayload(
  pagarmePlanId: string,
  customerId: string,
  paymentMethod: PaymentMethod,
) {
  const base: Record<string, unknown> = {
    plan_id: pagarmePlanId,
    customer_id: customerId,
    payment_method: paymentMethod,
  };

  if (paymentMethod === "boleto") {
    base.boleto_due_days = 3;
  } else {
    base.pix = { expires_in: 3600 };
  }

  return base;
}

function hasPaymentPayload(info: Record<string, unknown>) {
  return Object.values(info).some((value) => value != null && value !== "");
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

  return {
    pix_qr_code: tx.qr_code ?? tx.qrcode ?? null,
    pix_qr_code_url: tx.qr_code_url ?? tx.qrcode_url ?? null,
    pix_expires_at: tx.expires_at ?? null,
  };
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

    const subscription = await pagarme<PagarmeSubscription>(
      "/subscriptions",
      "POST",
      buildSubscriptionPayload(pagarmePlanId, customer.id, body.payment_method),
    );
    if (!subscription.id) throw new Error("Pagar.me subscription response missing id");

    const now = new Date();
    const trialDays = plan.trial_days ?? 0;
    const trialStart = trialDays > 0 ? now : null;
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : null;

    const status = mapPagarmeSubscriptionStatus(subscription.status, {
      trialDays,
      paymentMethod: body.payment_method,
    });

    const nextBilling = subscription.next_billing_at
      ? new Date(subscription.next_billing_at)
      : (trialEnd ?? null);
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : (trialEnd ?? null);

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
        status,
        is_trial: trialDays > 0,
        billing_cycle: body.billing_cycle,
        start_date: now.toISOString(),
        trial_start: trialStart?.toISOString() ?? null,
        trial_ends_at: trialEnd?.toISOString() ?? null,
        current_period_start: now.toISOString(),
        current_period_end: currentPeriodEnd?.toISOString() ?? null,
        next_billing_at: nextBilling?.toISOString() ?? null,
        pagarme_subscription_id: subscription.id,
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
          status,
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
