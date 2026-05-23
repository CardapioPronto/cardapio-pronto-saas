import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { captureEdgeException } from "../_shared/observability.ts";
import {
  mapOrderPaymentStatus,
  reconcileOrderPaymentFromPagarme,
  type PagarmeOrderPaymentData,
} from "../_shared/pagarme-order-payment-reconcile.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PAGARME_API_URL = "https://api.pagar.me/core/v5";
const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY") ?? "";

type Action = "reprocess_event" | "sync_order_payment";

type PagarmeEvent = {
  id?: string | null;
  type?: string | null;
  data?: PagarmeOrderPaymentData;
};

async function pagarmeApi<T>(path: string, method: string): Promise<T> {
  if (!PAGARME_SECRET_KEY) throw new Error("PAGARME_SECRET_KEY not configured");
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(PAGARME_SECRET_KEY + ":")}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const message = typeof data === "object" && data && "message" in data
      ? String((data as { message?: string }).message)
      : text;
    throw new Error(`Pagar.me ${method} ${path}: ${message || res.status}`);
  }
  return data as T;
}

async function requireSuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Não autenticado");

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) throw new Error("Não autenticado");

  const { data: isAdmin } = await supabase.rpc("is_super_admin", { user_id: userData.user.id });
  if (!isAdmin) throw new Error("Apenas super admin pode executar esta ação.");

  return userData.user.id;
}

async function reprocessWebhookEvent(eventLogId: string) {
  const { data: row, error } = await supabase
    .from("pagarme_webhook_events")
    .select("id, event_id, event_type, payload, processed, signature_valid")
    .eq("id", eventLogId)
    .maybeSingle();

  if (error) throw error;
  if (!row?.id) throw new Error("Evento de webhook não encontrado.");
  if (row.signature_valid === false) {
    throw new Error("Evento com assinatura inválida não pode ser reprocessado.");
  }

  const event = row.payload as PagarmeEvent;
  const eventType = event.type ?? row.event_type ?? "unknown";
  const data = (event.data ?? {}) as PagarmeOrderPaymentData;

  if (!eventType.startsWith("order.") && !eventType.startsWith("charge.")) {
    throw new Error(`Reprocessamento manual não suportado para event_type=${eventType}`);
  }

  const result = await reconcileOrderPaymentFromPagarme(supabase, eventType, data);

  await supabase
    .from("pagarme_webhook_events")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      processing_error: null,
    })
    .eq("id", row.id);

  return { success: true, event_type: eventType, reconcile: result };
}

async function syncOrderPayment(orderId: string) {
  const { data: payment, error } = await supabase
    .from("order_payments")
    .select("id, order_id, provider_order_id, provider_charge_id, status")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!payment?.provider_order_id) {
    throw new Error("Pedido sem provider_order_id do Pagar.me.");
  }

  const remote = await pagarmeApi<PagarmeOrderPaymentData>(
    `/orders/${encodeURIComponent(payment.provider_order_id)}`,
    "GET",
  );

  const chargeStatus = remote.charges?.[0]?.status ?? remote.status ?? "";
  const eventType = chargeStatus === "paid" ? "order.paid" : `order.${chargeStatus || "updated"}`;
  const mapped = mapOrderPaymentStatus(eventType, chargeStatus);
  const reconcileType = mapped === "paid"
    ? "order.paid"
    : mapped === "failed"
      ? "order.payment_failed"
      : mapped === "canceled"
        ? "order.canceled"
        : "order.updated";

  const result = await reconcileOrderPaymentFromPagarme(
    supabase,
    reconcileType,
    remote,
    { metadataOrderId: orderId, pagarmeOrderId: payment.provider_order_id },
  );

  return { success: true, order_id: orderId, remote_status: chargeStatus, reconcile: result };
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
    await requireSuperAdmin(req);
    const body = await req.json() as { action?: Action; eventLogId?: string; orderId?: string };

    if (body.action === "reprocess_event") {
      const eventLogId = String(body.eventLogId || "").trim();
      if (!eventLogId) throw new Error("eventLogId é obrigatório.");
      const result = await reprocessWebhookEvent(eventLogId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "sync_order_payment") {
      const orderId = String(body.orderId || "").trim();
      if (!orderId) throw new Error("orderId é obrigatório.");
      const result = await syncOrderPayment(orderId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await captureEdgeException(err, {
      functionName: "pagarme-webhook-admin",
      req,
    });
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
