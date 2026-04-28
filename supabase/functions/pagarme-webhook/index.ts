// Pagar.me Webhook Receiver
// URL: https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/pagarme-webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

// HMAC-SHA256 signature verification (Pagar.me v5 sends X-Hub-Signature)
async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn("[pagarme-webhook] PAGARME_WEBHOOK_SECRET not configured");
    return false;
  }
  if (!signatureHeader) return false;

  // Header may come as "sha256=abcdef..." or just "abcdef..."
  const expected = signatureHeader.replace(/^sha256=/, "").trim().toLowerCase();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // constant-time comparison
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
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

async function processEvent(event: any): Promise<void> {
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

    const update: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (subscription.next_billing_at) update.next_billing_at = subscription.next_billing_at;
    if (subscription.customer?.id) update.pagarme_customer_id = subscription.customer.id;

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
    if (!pagarmeSubId) return;

    let newStatus: string | null = null;
    if (type === "charge.paid" || type === "invoice.paid") newStatus = "active";
    else if (type === "charge.payment_failed" || type === "invoice.payment_failed") newStatus = "past_due";
    else if (type === "charge.refunded") newStatus = "canceled";

    const update: Record<string, any> = {
      last_payment_at: new Date().toISOString(),
      last_payment_status: charge.status ?? type,
      updated_at: new Date().toISOString(),
    };
    if (newStatus) update.status = newStatus;

    await supabase
      .from("subscriptions")
      .update(update)
      .eq("pagarme_subscription_id", pagarmeSubId);
  }
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

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId = event.id ?? null;
  const eventType = event.type ?? "unknown";
  const data = event.data ?? {};
  const pagarmeSubId = data.id ?? data.subscription_id ?? data.subscription?.id ?? null;
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