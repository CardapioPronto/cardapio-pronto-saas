import type { PedidoStatus } from "@/features/pdv/types";

export type KitchenOrderSource = "app" | "cardapio" | "ifood" | "whatsapp" | string | null;
export type KitchenOrderType = "mesa" | "balcao" | "delivery" | string | null;

export interface KitchenOrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  observations?: string | null;
}

export interface KitchenOrder {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  orderType: KitchenOrderType;
  source: KitchenOrderSource;
  status: PedidoStatus;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  tableLabel: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: KitchenOrderItem[];
}

export const KITCHEN_QUEUE_STATUSES: PedidoStatus[] = [
  "pendente",
  "preparo",
  "em-andamento",
  "pronto",
];
