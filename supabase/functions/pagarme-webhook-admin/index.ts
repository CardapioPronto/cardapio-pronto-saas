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

type Action =
  | "reprocess_event"
  | "sync_order_payment"
  | "update_subscription_start_at"
  | "cancel_subscription"
  | "sync_subscription";

type PagarmeEvent = {
  id?: string | null;
  type?: string | null;
  data?: PagarmeOrderPaymentData;
};

type PagarmeSubscriptionData = {
  id?: string | null;
  status?: string | null;
  start_at?: string | null;
  next_billing_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  interval?: string | null;
  customer?: { id?: string | null } | null;
};

async function pagarmeApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  if (!PAGARME_SECRET_KEY) throw new Error("PAGARME_SECRET_KEY not configured");
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(PAGARME_SECRET_KEY + ":")}`,
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

function mapSubscriptionStatus(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "active":
    case "paid":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "ended":
    case "failed":
      return "canceled";
    case "future":
    case "scheduled":
    case "pending":
      return "pending";
    case "trialing":
      return "trialing";
    default:
      return "pending";
  }
}

async function logAdminAction(
  userId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
) {
  const { error } = await supabase.rpc("log_admin_activity", {
    admin_id: userId,
    action,
    entity_type: "subscriptions",
    entity_id: entityId,
    details,
  });
  if (error) console.warn("[pagarme-webhook-admin] log_admin_activity:", error.message);
}

async function updateLocalSubscriptionFromRemote(
  pagarmeSubscriptionId: string,
  remote: PagarmeSubscriptionData,
) {
  const remoteStatus = remote.status ?? null;
  const localStatus = mapSubscriptionStatus(remoteStatus);
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: localStatus,
    last_payment_status: remoteStatus,
    updated_at: now,
  };

  if (remote.customer?.id) update.pagarme_customer_id = remote.customer.id;
  if (remote.interval === "month") update.billing_cycle = "monthly";
  if (remote.interval === "year") update.billing_cycle = "yearly";

  if (localStatus === "active") {
    update.is_trial = false;
    update.trial_start = null;
    update.trial_ends_at = null;
    if (remote.current_period_start) update.current_period_start = remote.current_period_start;
    if (remote.current_period_end) update.current_period_end = remote.current_period_end;
    if (remote.next_billing_at) update.next_billing_at = remote.next_billing_at;
  } else if (localStatus === "pending") {
    const startAt = remote.start_at ?? remote.next_billing_at ?? null;
    if (startAt) {
      update.current_period_end = startAt;
      update.next_billing_at = startAt;
    }
    if (remote.current_period_start) update.current_period_start = remote.current_period_start;
    if (remote.current_period_end) update.current_period_end = remote.current_period_end;
  } else if (localStatus === "canceled") {
    update.end_date = now;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update(update)
    .eq("pagarme_subscription_id", pagarmeSubscriptionId)
    .select("id, status, current_period_end, next_billing_at")
    .maybeSingle();

  if (error) throw error;
  return { local: data, update };
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

function validateStartAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data de início inválida.");
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (parsed.getTime() < todayStart.getTime()) {
    throw new Error("O Pagar.me não permite alterar start_at para uma data anterior ao dia atual.");
  }
  return parsed.toISOString();
}

async function updateSubscriptionStartAt(userId: string, subscriptionId: string, startAt: string) {
  const safeStartAt = validateStartAt(startAt);
  const remote = await pagarmeApi<PagarmeSubscriptionData>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/start-at`,
    "PATCH",
    { start_at: safeStartAt },
  );
  const synced = await updateLocalSubscriptionFromRemote(subscriptionId, {
    ...remote,
    id: remote.id ?? subscriptionId,
    start_at: remote.start_at ?? safeStartAt,
    status: remote.status ?? "future",
  });
  await logAdminAction(userId, "pagarme_update_subscription_start_at", synced.local?.id ?? subscriptionId, {
    pagarme_subscription_id: subscriptionId,
    start_at: safeStartAt,
    remote_status: remote.status ?? null,
  });
  return { success: true, subscription_id: subscriptionId, start_at: safeStartAt, remote, synced };
}

async function cancelSubscription(userId: string, subscriptionId: string) {
  const remote = await pagarmeApi<PagarmeSubscriptionData>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    "DELETE",
  );
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      end_date: now,
      last_payment_status: remote.status ?? "canceled",
      updated_at: now,
    })
    .eq("pagarme_subscription_id", subscriptionId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  await logAdminAction(userId, "pagarme_cancel_subscription", data?.id ?? subscriptionId, {
    pagarme_subscription_id: subscriptionId,
    remote_status: remote.status ?? null,
  });
  return { success: true, subscription_id: subscriptionId, remote };
}

async function syncSubscription(userId: string, subscriptionId: string) {
  const remote = await pagarmeApi<PagarmeSubscriptionData>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    "GET",
  );
  const synced = await updateLocalSubscriptionFromRemote(subscriptionId, remote);
  await logAdminAction(userId, "pagarme_sync_subscription", synced.local?.id ?? subscriptionId, {
    pagarme_subscription_id: subscriptionId,
    remote_status: remote.status ?? null,
    start_at: remote.start_at ?? null,
  });
  return { success: true, subscription_id: subscriptionId, remote, synced };
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
    const userId = await requireSuperAdmin(req);
    const body = await req.json() as {
      action?: Action;
      eventLogId?: string;
      orderId?: string;
      subscriptionId?: string;
      startAt?: string;
    };

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

    if (body.action === "update_subscription_start_at") {
      const subscriptionId = String(body.subscriptionId || "").trim();
      const startAt = String(body.startAt || "").trim();
      if (!subscriptionId) throw new Error("subscriptionId é obrigatório.");
      if (!startAt) throw new Error("startAt é obrigatório.");
      const result = await updateSubscriptionStartAt(userId, subscriptionId, startAt);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "cancel_subscription") {
      const subscriptionId = String(body.subscriptionId || "").trim();
      if (!subscriptionId) throw new Error("subscriptionId é obrigatório.");
      const result = await cancelSubscription(userId, subscriptionId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "sync_subscription") {
      const subscriptionId = String(body.subscriptionId || "").trim();
      if (!subscriptionId) throw new Error("subscriptionId é obrigatório.");
      const result = await syncSubscription(userId, subscriptionId);
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
