import { supabase } from "@/integrations/supabase/client";
import { alterarStatusPedido } from "@/features/pdv/services/pedidoService";
import type { PedidoStatus } from "@/features/pdv/types";
import {
  KITCHEN_QUEUE_STATUSES,
  type KitchenOrder,
  type KitchenOrderItem,
} from "./types";

type KitchenOrderRow = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_type: string | null;
  source: string | null;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  table_id: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  order_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price: number;
    observations: string | null;
  }> | null;
  mesa?: {
    id: string;
    name: string | null;
    number: string | null;
  } | null;
};

const tableLabelFor = (order: KitchenOrderRow) => {
  if (order.order_type === "delivery") return "Delivery";
  if (order.order_type === "balcao") return "Balcao";
  if (order.mesa?.number) return `Mesa ${order.mesa.number}`;
  if (order.mesa?.name) return order.mesa.name;
  return "Balcao";
};

const mapOrder = (order: KitchenOrderRow): KitchenOrder => ({
  id: order.id,
  orderNumber: order.order_number,
  customerName: order.customer_name,
  customerPhone: order.customer_phone,
  orderType: order.order_type,
  source: order.source,
  status: order.status as PedidoStatus,
  paymentMethod: order.payment_method,
  paymentStatus: order.payment_status,
  tableLabel: tableLabelFor(order),
  total: Number(order.total || 0),
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  items: (order.order_items || []).map((item): KitchenOrderItem => ({
    id: item.id,
    productName: item.product_name,
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    observations: item.observations,
  })),
});

export async function listKitchenOrders(restaurantId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      customer_name,
      customer_phone,
      order_type,
      source,
      status,
      payment_method,
      payment_status,
      table_id,
      total,
      created_at,
      updated_at,
      order_items (
        id,
        product_name,
        quantity,
        price,
        observations
      ),
      mesa:mesas (
        id,
        name,
        number
      )
    `)
    .eq("restaurant_id", restaurantId)
    .in("status", KITCHEN_QUEUE_STATUSES)
    .order("created_at", { ascending: true })
    .limit(120);

  if (error) throw error;
  return ((data || []) as KitchenOrderRow[]).map(mapOrder);
}

export async function updateKitchenOrderStatus(orderId: string, status: PedidoStatus) {
  return alterarStatusPedido(orderId, status);
}
