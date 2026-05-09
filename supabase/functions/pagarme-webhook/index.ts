// Pagar.me Webhook Receiver
// URL: https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/pagarme-webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature, x-pagarme-signature",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WEBHOOK_SECRET = Deno.env.get("PAGARME_WEBHOOK_SECRET") ?? "";
const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY") ?? "";

type PagarmeNestedObject = {
  id?: string | null;
  subscription_id?: string | null;
  metadata?: { order_id?: string | null } | null;
};

type PagarmeData = {
  id?: string | null;
  status?: string | null;
  subscription_id?: string | null;
  order_id?: string | null;
  next_billing_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  interval?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  metadata?: { order_id?: string | null } | null;
  subscription?: PagarmeNestedObject | null;
  invoice?: PagarmeNestedObject | null;
  order?: PagarmeNestedObject | null;
  charge?: PagarmeNestedObject | null;
  charges?: PagarmeNestedObject[] | null;
  customer?: PagarmeNestedObject | null;
  customer_id?: string | null;
  [key: string]: unknown;
};

type PagarmeEvent = {
  id?: string | null;
  type?: string | null;
  data?: PagarmeData | null;
  [key: string]: unknown;
};

type SubscriptionWithRestaurant = {
  id: string;
  restaurant_id: string;
  plan_id: string;
  restaurants?: { owner_id?: string | null } | null;
};

function normalizeSignature(signatureHeader: string | null) {
  return (signatureHeader ?? "")
    .replace(/^sha1=/i, "")
    .replace(/^sha256=/i, "")
    .trim()
    .toLowerCase();
}

async function hmacHex(rawBody: string, secret: string, hash: "SHA-1" | "SHA-256") {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(computed: string, expected: string) {
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;

  const expected = normalizeSignature(signatureHeader);
  if (!expected) return false;

  const secrets = [WEBHOOK_SECRET, PAGARME_SECRET_KEY].filter(Boolean);
  if (secrets.length === 0) {
    console.warn("[pagarme-webhook] PAGARME_WEBHOOK_SECRET/PAGARME_SECRET_KEY not configured");
    return false;
  }

  for (const secret of secrets) {
    for (const hash of ["SHA-256", "SHA-1"] as const) {
      const computed = await hmacHex(rawBody, secret, hash);
      if (timingSafeEqualHex(computed, expected)) return true;
    }
  }

  return false;
}

function extractPagarmeSubscriptionId(type: string, data: PagarmeData) {
  if (type.startsWith("subscription.")) return data.id ?? data.subscription_id ?? null;
  return data.subscription_id ?? data.subscription?.id ?? data.invoice?.subscription_id ?? null;
}

function extractPagarmeOrderId(type: string, data: PagarmeData) {
  if (type.startsWith("order.")) return data.id ?? null;
  return data.order?.id ?? data.order_id ?? null;
}

function mapStatus(pagarmeStatus: string): string {
  switch (pagarmeStatus) {
    case "active":
    case "paid":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "failed":
      return "past_due";
    case "canceled":
    case "ended":
      return "canceled";
    case "pending":
      return "pending";
    default:
      return pagarmeStatus;
  }
}

async function processEvent(event: PagarmeEvent): Promise<void> {
  const type: string = event.type ?? "";
  const data = event.data ?? {};

  // Subscription events
  if (type.startsWith("subscription.")) {
    const subscription = data;
    const pagarmeSubId = subscription.id;
    if (!pagarmeSubId) return;

    const newStatus = type === "subscription.canceled"
      ? "canceled"
      : mapStatus(subscription.status ?? "active");

    const update: Record<string, string | null> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (subscription.next_billing_at) update.next_billing_at = subscription.next_billing_at;
    if (subscription.customer?.id) update.pagarme_customer_id = subscription.customer.id;
    if (subscription.current_period_start) update.current_period_start = subscription.current_period_start;
    if (subscription.current_period_end) update.current_period_end = subscription.current_period_end;
    if (subscription.interval === "month") update.billing_cycle = "monthly";
    else if (subscription.interval === "year") update.billing_cycle = "yearly";
    if (newStatus === "canceled") update.end_date = new Date().toISOString();

    await supabase
      .from("subscriptions")
      .update(update)
      .eq("pagarme_subscription_id", pagarmeSubId);
    return;
  }

  // Charge / invoice events
  if (type.startsWith("charge.") || type.startsWith("invoice.")) {
    const charge = data;
    const pagarmeSubId = charge.subscription_id ?? charge.subscription?.id ?? charge.invoice?.subscription_id;
    if (!pagarmeSubId) {
      await processOrderPaymentEvent(type, charge);
      return;
    }

    let newStatus: string | null = null;
    if (type === "charge.paid" || type === "invoice.paid") newStatus = "active";
    else if (type === "charge.payment_failed" || type === "invoice.payment_failed") newStatus = "past_due";
    else if (type === "charge.refunded") newStatus = "canceled";

    const update: Record<string, string | null> = {
      last_payment_at: new Date().toISOString(),
      last_payment_status: charge.status ?? type,
      updated_at: new Date().toISOString(),
    };
    if (newStatus) update.status = newStatus;

    await supabase
      .from("subscriptions")
      .update(update)
      .eq("pagarme_subscription_id", pagarmeSubId);

    if (newStatus === "active") {
      await sendSubscriptionReceipt(pagarmeSubId, charge).catch((error) =>
        console.error("[pagarme-webhook] receipt email failed:", error),
      );
    }
  }

  if (type.startsWith("order.")) {
    await processOrderPaymentEvent(type, data);
  }
}

async function processOrderPaymentEvent(type: string, data: PagarmeData) {
  const pagarmeOrderId = extractPagarmeOrderId(type, data);
  const pagarmeChargeId = data.id && type.startsWith("charge.")
    ? data.id
    : data.charge?.id ?? data.charges?.[0]?.id ?? null;
  const metadataOrderId = data.metadata?.order_id ?? data.order?.metadata?.order_id ?? null;
  const newPaymentStatus = mapOrderPaymentStatus(type, data.status);

  if (!newPaymentStatus) return;

  let paymentQuery = supabase
    .from("order_payments")
    .select("*");

  if (metadataOrderId) {
    paymentQuery = paymentQuery.eq("order_id", metadataOrderId);
  } else if (pagarmeOrderId) {
    paymentQuery = paymentQuery.eq("provider_order_id", pagarmeOrderId);
  } else if (pagarmeChargeId) {
    paymentQuery = paymentQuery.eq("provider_charge_id", pagarmeChargeId);
  } else {
    return;
  }

  const { data: payment } = await paymentQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.order_id) return;

  const paidAt = newPaymentStatus === "paid" ? new Date().toISOString() : payment.paid_at;
  await supabase
    .from("order_payments")
    .update({
      status: newPaymentStatus,
      paid_at: paidAt,
      provider_order_id: pagarmeOrderId ?? payment.provider_order_id,
      provider_charge_id: pagarmeChargeId ?? payment.provider_charge_id,
      raw_response: data,
    })
    .eq("id", payment.id);

  const orderStatus = newPaymentStatus === "paid"
    ? "pendente"
    : newPaymentStatus === "pending"
      ? "aguardando_pagamento"
      : "pagamento_falhou";

  await supabase
    .from("orders")
    .update({
      payment_status: newPaymentStatus,
      payment_provider: "pagarme",
      payment_reference: pagarmeOrderId ?? pagarmeChargeId ?? payment.provider_order_id,
      paid_at: paidAt,
      status: orderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.order_id);

  await supabase
    .from("delivery_orders")
    .update({
      payment_status: newPaymentStatus,
      payment_provider: "pagarme",
      payment_reference: pagarmeOrderId ?? pagarmeChargeId ?? payment.provider_order_id,
      paid_at: paidAt,
      status: newPaymentStatus === "paid"
        ? "pending"
        : newPaymentStatus === "pending"
          ? "awaiting_payment"
          : "payment_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", payment.order_id);

  if (newPaymentStatus === "paid") {
    const { data: order } = await supabase
      .from("orders")
      .select("restaurant_id, order_type, table_id")
      .eq("id", payment.order_id)
      .maybeSingle();

    if (order?.order_type === "mesa" && order.table_id) {
      await supabase
        .from("mesas")
        .update({ status: "ocupada", updated_at: new Date().toISOString() })
        .eq("id", order.table_id)
        .eq("restaurant_id", order.restaurant_id);
    }
  }
}

function mapOrderPaymentStatus(type: string, status?: string): string | null {
  if (type === "order.paid" || type === "charge.paid") return "paid";
  if (type === "order.payment_failed" || type === "charge.payment_failed") return "failed";
  if (type === "order.canceled" || type === "charge.canceled") return "canceled";
  if (type === "charge.refunded") return "refunded";

  switch (status) {
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    case "pending":
      return "pending";
    default:
      return null;
  }
}

async function sendSubscriptionReceipt(pagarmeSubId: string, charge: PagarmeData) {
  const { data: subData } = await supabase
    .from("subscriptions")
    .select("id, restaurant_id, plan_id, restaurants:restaurant_id(owner_id)")
    .eq("pagarme_subscription_id", pagarmeSubId)
    .maybeSingle();

  const sub = subData as SubscriptionWithRestaurant | null;
  if (!sub?.restaurant_id) return;

  const { data: plan } = await supabase
    .from("plans")
    .select("name")
    .eq("id", sub.plan_id)
    .maybeSingle();

  const ownerId = sub.restaurants?.owner_id;
  if (!ownerId) return;

  const { data: owner } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", ownerId)
    .maybeSingle();

  if (!owner?.email) return;

  const amount = Number(charge.amount || charge.paid_amount || 0) / 100;
  await sendManagedEmail({
    admin: supabase,
    restaurantId: sub.restaurant_id,
    templateKey: "subscription_receipt",
    emailType: "transactional",
    to: owner.email,
    recipientName: owner.name,
    contextType: "subscription",
    contextId: sub.id,
    variables: {
      plan_name: plan?.name || "Plano Pubfy",
      amount: amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      status: charge.status || "paid",
      paid_at: new Date().toLocaleString("pt-BR"),
    },
    metadata: { source: "pagarme_webhook", pagarme_subscription_id: pagarmeSubId },
  });
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

  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("x-hub-signature") ??
    req.headers.get("x-pagarme-signature") ??
    req.headers.get("X-Hub-Signature");

  const signatureValid = await verifySignature(rawBody, signatureHeader);

  let event: PagarmeEvent;
  try {
    event = JSON.parse(rawBody) as PagarmeEvent;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId = event.id ?? null;
  const eventType = event.type ?? "unknown";
  const data = event.data ?? {};
  const pagarmeSubId = extractPagarmeSubscriptionId(eventType, data);
  const pagarmeOrderId = extractPagarmeOrderId(eventType, data);
  const metadataOrderId = data.metadata?.order_id ?? data.order?.metadata?.order_id ?? null;
  const pagarmeCustomerId = data.customer?.id ?? data.customer_id ?? null;

  // Idempotency: skip already-processed events
  if (eventId) {
    const { data: existing } = await supabase
      .from("pagarme_webhook_events")
      .select("id, processed")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing?.processed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Log event
  const { data: logRow } = await supabase
    .from("pagarme_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      pagarme_subscription_id: pagarmeSubId,
      pagarme_order_id: pagarmeOrderId,
      order_id: metadataOrderId,
      pagarme_customer_id: pagarmeCustomerId,
      payload: event,
      signature_valid: signatureValid,
    })
    .select("id")
    .maybeSingle();

  // Reject when signature invalid (after logging for audit)
  if (!signatureValid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    await processEvent(event);
    if (logRow?.id) {
      await supabase
        .from("pagarme_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", logRow.id);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[pagarme-webhook] processing error:", msg);
    if (logRow?.id) {
      await supabase
        .from("pagarme_webhook_events")
        .update({ processing_error: msg })
        .eq("id", logRow.id);
    }
    // Return 200 anyway so Pagar.me does not retry indefinitely on processing bugs
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
