import type { DadosClientePedido, ItemPedido, ProdutoSimplificado } from "../types";

const QUEUE_VERSION = 1;
const STORAGE_KEY_PREFIX = "pubfy:pdv-offline-orders";

export type PDVOfflineOrderStatus = "pending" | "syncing" | "error";

export type PDVOfflineOrder = {
  version: number;
  clientOrderId: string;
  restaurantId: string;
  orderType: "balcao";
  items: ItemPedido[];
  total: number;
  customer: DadosClientePedido;
  createdAt: string;
  status: PDVOfflineOrderStatus;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
};

const storageKey = (restaurantId: string) =>
  `${STORAGE_KEY_PREFIX}:v${QUEUE_VERSION}:${restaurantId}`;

const notifyQueueChanged = (restaurantId: string) => {
  window.dispatchEvent(
    new CustomEvent("pdv-offline-queue:changed", { detail: { restaurantId } }),
  );
};

const toQueueItem = (item: ItemPedido, restaurantId: string): ItemPedido => {
  const product: ProdutoSimplificado = {
    id: item.produto.id,
    name: item.produto.name,
    price: item.produto.price,
    description: item.produto.description ?? "",
    available: item.produto.available ?? true,
    category: item.produto.category ?? null,
    restaurant_id: item.produto.restaurant_id ?? restaurantId,
  };

  return {
    produto: product,
    quantidade: item.quantidade,
    observacao: item.observacao ?? null,
  };
};

const isValidOrder = (value: unknown, restaurantId: string): value is PDVOfflineOrder => {
  if (!value || typeof value !== "object") return false;
  const order = value as Partial<PDVOfflineOrder>;

  return order.version === QUEUE_VERSION
    && order.restaurantId === restaurantId
    && order.orderType === "balcao"
    && typeof order.clientOrderId === "string"
    && typeof order.createdAt === "string"
    && Array.isArray(order.items);
};

export function createPDVClientOrderId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `pdv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function readPDVOfflineOrderQueue(restaurantId: string): PDVOfflineOrder[] {
  if (!restaurantId || typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey(restaurantId));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((order) => isValidOrder(order, restaurantId))
      .map((order) => order.status === "syncing" ? { ...order, status: "pending" as const } : order)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch (error) {
    console.warn("Não foi possível ler a fila offline do PDV:", error);
    return [];
  }
}

export function writePDVOfflineOrderQueue(
  restaurantId: string,
  orders: PDVOfflineOrder[],
) {
  if (!restaurantId || typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(storageKey(restaurantId), JSON.stringify(orders));
    notifyQueueChanged(restaurantId);
    return true;
  } catch (error) {
    console.error("Não foi possível salvar a fila offline do PDV:", error);
    return false;
  }
}

export function enqueuePDVOfflineOrder(params: {
  restaurantId: string;
  items: ItemPedido[];
  total: number;
  customer: DadosClientePedido;
}): PDVOfflineOrder {
  const order: PDVOfflineOrder = {
    version: QUEUE_VERSION,
    clientOrderId: createPDVClientOrderId(),
    restaurantId: params.restaurantId,
    orderType: "balcao",
    items: params.items.map((item) => toQueueItem(item, params.restaurantId)),
    total: params.total,
    customer: {
      nomeCliente: params.customer.nomeCliente?.trim() || undefined,
      telefoneCliente: params.customer.telefoneCliente?.trim() || undefined,
      aceitaMarketing: params.customer.aceitaMarketing ?? false,
    },
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
  };

  const current = readPDVOfflineOrderQueue(params.restaurantId);
  if (!writePDVOfflineOrderQueue(params.restaurantId, [...current, order])) {
    throw new Error("Não foi possível salvar o pedido neste dispositivo.");
  }

  return order;
}
