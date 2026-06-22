import type { DadosClientePedido, ItemPedido, ProdutoSimplificado } from "../types";
import { getLocalDeviceInfo } from "@/lib/localDevice";
import type { MesaStatus } from "@/types/mesa";

const QUEUE_VERSION = 1;
const STORAGE_KEY_PREFIX = "pubfy:pdv-offline-orders";

export type PDVOfflineOrderStatus = "pending" | "syncing" | "review" | "error";

export type PDVOfflineOrderOperator = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type PDVOfflineTableSnapshot = {
  id: string;
  number: string;
  name?: string | null;
  status: MesaStatus;
  updatedAt: string;
};

export type PDVOfflineTableConflict = {
  detectedAt: string;
  reason: string;
  canConfirm: boolean;
  currentStatus?: MesaStatus | null;
  currentUpdatedAt?: string | null;
};

export type PDVOfflineCurrentTableState = {
  number: string;
  status: MesaStatus;
  isActive: boolean;
  updatedAt: string;
};

export type PDVOfflineTableValidation = {
  outcome: "safe" | "review" | "blocked";
  conflict: PDVOfflineTableConflict | null;
};

export function evaluatePDVOfflineTableSnapshot(
  snapshot: PDVOfflineTableSnapshot,
  current: PDVOfflineCurrentTableState | null,
  detectedAt = new Date().toISOString(),
): PDVOfflineTableValidation {
  if (!current || !current.isActive) {
    return {
      outcome: "blocked",
      conflict: {
        detectedAt,
        reason: `A Mesa ${snapshot.number} nao existe mais ou foi desativada.`,
        canConfirm: false,
        currentStatus: current?.status ?? null,
        currentUpdatedAt: current?.updatedAt ?? null,
      },
    };
  }

  if (current.status === "indisponivel") {
    return {
      outcome: "blocked",
      conflict: {
        detectedAt,
        reason: `A Mesa ${current.number} esta indisponivel e nao pode receber o pedido.`,
        canConfirm: false,
        currentStatus: current.status,
        currentUpdatedAt: current.updatedAt,
      },
    };
  }

  const statusChanged = current.status !== snapshot.status;
  const versionChanged = current.updatedAt !== snapshot.updatedAt;
  if (statusChanged || versionChanged) {
    return {
      outcome: "review",
      conflict: {
        detectedAt,
        reason: `A Mesa ${current.number} mudou de ${snapshot.status} para ${current.status} desde o ultimo acesso. Revise antes de sincronizar.`,
        canConfirm: true,
        currentStatus: current.status,
        currentUpdatedAt: current.updatedAt,
      },
    };
  }

  return { outcome: "safe", conflict: null };
}

export type PDVOfflineOrder = {
  version: number;
  clientOrderId: string;
  restaurantId: string;
  orderType: "balcao" | "mesa";
  table?: PDVOfflineTableSnapshot | null;
  items: ItemPedido[];
  total: number;
  customer: DadosClientePedido;
  createdAt: string;
  status: PDVOfflineOrderStatus;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  deviceId?: string | null;
  deviceLabel?: string | null;
  operatorUserId?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  tableConflict?: PDVOfflineTableConflict | null;
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

  const hasValidOrderType = order.orderType === "balcao"
    || (order.orderType === "mesa"
      && Boolean(order.table)
      && typeof order.table?.id === "string"
      && typeof order.table?.number === "string"
      && typeof order.table?.updatedAt === "string");

  return order.version === QUEUE_VERSION
    && order.restaurantId === restaurantId
    && hasValidOrderType
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
  orderType?: "balcao" | "mesa";
  table?: PDVOfflineTableSnapshot | null;
  items: ItemPedido[];
  total: number;
  customer: DadosClientePedido;
  operator?: PDVOfflineOrderOperator | null;
}): PDVOfflineOrder {
  const device = getLocalDeviceInfo();
  const orderType = params.orderType ?? "balcao";

  if (orderType === "mesa" && !params.table) {
    throw new Error("Selecione uma mesa valida antes de salvar offline.");
  }

  const order: PDVOfflineOrder = {
    version: QUEUE_VERSION,
    clientOrderId: createPDVClientOrderId(),
    restaurantId: params.restaurantId,
    orderType,
    table: orderType === "mesa" ? params.table : null,
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
    deviceId: device?.id ?? null,
    deviceLabel: device?.label ?? null,
    operatorUserId: params.operator?.id ?? null,
    operatorName: params.operator?.name ?? null,
    operatorEmail: params.operator?.email ?? null,
    tableConflict: null,
  };

  const current = readPDVOfflineOrderQueue(params.restaurantId);
  if (!writePDVOfflineOrderQueue(params.restaurantId, [...current, order])) {
    throw new Error("Não foi possível salvar o pedido neste dispositivo.");
  }

  return order;
}
