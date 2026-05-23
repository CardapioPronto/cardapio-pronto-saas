import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type PagarmeOrderPaymentData = {
  id?: string | null;
  status?: string | null;
  customer?: { id?: string | null } | null;
  customer_id?: string | null;
  metadata?: { order_id?: string | null } | null;
  order?: { metadata?: { order_id?: string | null } | null } | null;
  charge?: { id?: string | null } | null;
  charges?: Array<{ id?: string | null; status?: string | null }> | null;
};

function throwIfDbError(label: string, result: { error: { message?: string } | null }) {
  if (result.error) {
    throw new Error(`[pagarme-reconcile] ${label}: ${result.error.message ?? "database error"}`);
  }
}

export function mapOrderPaymentStatus(type: string, status?: string): string | null {
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

function extractPagarmeOrderId(type: string, data: PagarmeOrderPaymentData): string | null {
  if (type.startsWith("order.")) return data.id ?? null;
  const extended = data as PagarmeOrderPaymentData & { order?: { id?: string | null }; order_id?: string | null };
  return extended.order?.id ?? extended.order_id ?? null;
}

/** Aplica status de pagamento do Pagar.me ao pedido local (cardápio / order_payments). */
export async function reconcileOrderPaymentFromPagarme(
  supabase: SupabaseClient,
  type: string,
  data: PagarmeOrderPaymentData,
  options?: { metadataOrderId?: string | null; pagarmeOrderId?: string | null },
): Promise<{ order_id: string; payment_status: string } | null> {
  const pagarmeOrderId = options?.pagarmeOrderId ?? extractPagarmeOrderId(type, data);
  const pagarmeChargeId = data.id && type.startsWith("charge.")
    ? data.id
    : data.charge?.id ?? data.charges?.[0]?.id ?? null;
  const metadataOrderId = options?.metadataOrderId ??
    data.metadata?.order_id ?? data.order?.metadata?.order_id ?? null;
  const newPaymentStatus = mapOrderPaymentStatus(type, data.status ?? data.charges?.[0]?.status ?? undefined);

  if (!newPaymentStatus) return null;

  let paymentQuery = supabase.from("order_payments").select("*");
  if (metadataOrderId) {
    paymentQuery = paymentQuery.eq("order_id", metadataOrderId);
  } else if (pagarmeOrderId) {
    paymentQuery = paymentQuery.eq("provider_order_id", pagarmeOrderId);
  } else if (pagarmeChargeId) {
    paymentQuery = paymentQuery.eq("provider_charge_id", pagarmeChargeId);
  } else {
    return null;
  }

  const { data: payment, error: paymentSelectError } = await paymentQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentSelectError) {
    throw new Error(`[pagarme-reconcile] order_payments.select: ${paymentSelectError.message}`);
  }
  if (!payment?.order_id) return null;

  const paidAt = newPaymentStatus === "paid" ? new Date().toISOString() : payment.paid_at;
  throwIfDbError(
    "order_payments.update",
    await supabase
      .from("order_payments")
      .update({
        status: newPaymentStatus,
        paid_at: paidAt,
        provider_order_id: pagarmeOrderId ?? payment.provider_order_id,
        provider_charge_id: pagarmeChargeId ?? payment.provider_charge_id,
        raw_response: data,
      })
      .eq("id", payment.id),
  );

  const orderStatus = newPaymentStatus === "paid"
    ? "pendente"
    : newPaymentStatus === "pending"
      ? "aguardando_pagamento"
      : "pagamento_falhou";

  throwIfDbError(
    "orders.update",
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
      .eq("id", payment.order_id),
  );

  throwIfDbError(
    "delivery_orders.update",
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
      .eq("order_id", payment.order_id),
  );

  if (newPaymentStatus === "paid") {
    const { data: order, error: orderFetchError } = await supabase
      .from("orders")
      .select("restaurant_id, order_type, table_id")
      .eq("id", payment.order_id)
      .maybeSingle();

    if (orderFetchError) {
      throw new Error(`[pagarme-reconcile] orders.select: ${orderFetchError.message}`);
    }

    if (order?.order_type === "mesa" && order.table_id) {
      throwIfDbError(
        "mesas.update",
        await supabase
          .from("mesas")
          .update({ status: "ocupada", updated_at: new Date().toISOString() })
          .eq("id", order.table_id)
          .eq("restaurant_id", order.restaurant_id),
      );
    }
  }

  return { order_id: payment.order_id, payment_status: newPaymentStatus };
}
