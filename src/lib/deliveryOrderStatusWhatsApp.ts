import type { PedidoStatus } from "@/features/pdv/types";

/** Alinhado ao trigger `sync_delivery_order_status_from_order`. */
export function mapPedidoStatusToDeliveryStatus(
  status: PedidoStatus,
): string | null {
  const map: Record<PedidoStatus, string | null> = {
    aguardando_pagamento: "awaiting_payment",
    pagamento_falhou: "payment_failed",
    pendente: "pending",
    preparo: "preparing",
    "em-andamento": "preparing",
    pronto: "ready",
    finalizado: "delivered",
    cancelado: "cancelled",
  };
  return map[status] ?? null;
}

export async function notifyDeliveryOrderStatusWhatsApp(
  orderId: string,
  newStatus: string,
): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");

  const { data: deliveryOrder, error } = await supabase
    .from("delivery_orders")
    .select("id, customer_phone")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!deliveryOrder?.id || !deliveryOrder.customer_phone?.trim()) return;

  await supabase.functions.invoke("send-delivery-whatsapp", {
    body: {
      delivery_order_id: deliveryOrder.id,
      event: "status_changed",
      new_status: newStatus,
    },
  });
}
