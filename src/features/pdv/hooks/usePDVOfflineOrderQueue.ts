import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { captureCrmLeadFromOrder } from "@/services/crmService";
import { salvarPedido } from "../services/pedidoService";
import type { DadosClientePedido, ItemPedido } from "../types";
import {
  enqueuePDVOfflineOrder,
  PDVOfflineOrder,
  readPDVOfflineOrderQueue,
  writePDVOfflineOrderQueue,
} from "../services/pdvOfflineOrderQueueService";

const getCreatedOrderId = (pedido: unknown) => {
  if (!pedido || typeof pedido !== "object") return null;
  const value = pedido as { id?: unknown; order_id?: unknown };
  return typeof value.order_id === "string"
    ? value.order_id
    : typeof value.id === "string"
      ? value.id
      : null;
};

const errorMessageFromResult = (result: {
  errorMessage?: string;
  error?: unknown;
}) => {
  if (result.errorMessage) return result.errorMessage;
  if (result.error instanceof Error) return result.error.message;
  return "Não foi possível sincronizar este pedido.";
};

export function usePDVOfflineOrderQueue(restaurantId: string) {
  const { isOnline, isChecking } = useNetworkStatus();
  const [orders, setOrders] = useState<PDVOfflineOrder[]>([]);
  const syncingIdsRef = useRef(new Set<string>());

  const reload = useCallback(() => {
    setOrders(readPDVOfflineOrderQueue(restaurantId));
  }, [restaurantId]);

  const persist = useCallback((next: PDVOfflineOrder[]) => {
    writePDVOfflineOrderQueue(restaurantId, next);
    setOrders(next);
  }, [restaurantId]);

  const updateOrder = useCallback((
    clientOrderId: string,
    updater: (order: PDVOfflineOrder) => PDVOfflineOrder,
  ) => {
    const current = readPDVOfflineOrderQueue(restaurantId);
    persist(current.map((order) =>
      order.clientOrderId === clientOrderId ? updater(order) : order
    ));
  }, [persist, restaurantId]);

  const removeOrder = useCallback((clientOrderId: string) => {
    const current = readPDVOfflineOrderQueue(restaurantId);
    persist(current.filter((order) => order.clientOrderId !== clientOrderId));
  }, [persist, restaurantId]);

  const syncOrder = useCallback(async (order: PDVOfflineOrder) => {
    if (!isOnline || isChecking || syncingIdsRef.current.has(order.clientOrderId)) return false;

    syncingIdsRef.current.add(order.clientOrderId);
    updateOrder(order.clientOrderId, (current) => ({
      ...current,
      status: "syncing",
      attempts: current.attempts + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: null,
    }));

    try {
      const result = await salvarPedido(
        order.restaurantId,
        "Balcão",
        order.items,
        order.total,
        "",
        order.customer.nomeCliente,
        order.customer.telefoneCliente,
        undefined,
        undefined,
        order.clientOrderId,
        true,
      );

      if (!result.success) {
        updateOrder(order.clientOrderId, (current) => ({
          ...current,
          status: "error",
          lastError: errorMessageFromResult(result),
        }));
        return false;
      }

      const orderId = getCreatedOrderId(result.pedido);
      if (orderId) {
        captureCrmLeadFromOrder(orderId, {
          acceptsMarketing: order.customer.aceitaMarketing ?? null,
          source: "pdv",
        }).catch((error) => {
          console.warn("Falha opcional ao capturar lead do pedido offline:", error);
        });
      }

      removeOrder(order.clientOrderId);
      toast.success("Pedido offline sincronizado com sucesso.");
      return true;
    } catch (error) {
      updateOrder(order.clientOrderId, (current) => ({
        ...current,
        status: "error",
        lastError: error instanceof Error ? error.message : "Falha inesperada na sincronização.",
      }));
      return false;
    } finally {
      syncingIdsRef.current.delete(order.clientOrderId);
    }
  }, [isChecking, isOnline, removeOrder, updateOrder]);

  const syncPendingOrders = useCallback(async () => {
    if (!isOnline || isChecking) return;

    const pending = readPDVOfflineOrderQueue(restaurantId)
      .filter((order) => order.status === "pending");

    for (const order of pending) {
      await syncOrder(order);
    }
  }, [isChecking, isOnline, restaurantId, syncOrder]);

  const retryOrder = useCallback(async (clientOrderId: string) => {
    const order = readPDVOfflineOrderQueue(restaurantId)
      .find((item) => item.clientOrderId === clientOrderId);
    if (!order) return false;

    const pendingOrder = { ...order, status: "pending" as const, lastError: null };
    updateOrder(clientOrderId, () => pendingOrder);
    return syncOrder(pendingOrder);
  }, [restaurantId, syncOrder, updateOrder]);

  const enqueueOrder = useCallback((params: {
    items: ItemPedido[];
    total: number;
    customer: DadosClientePedido;
  }) => {
    const order = enqueuePDVOfflineOrder({
      restaurantId,
      items: params.items,
      total: params.total,
      customer: params.customer,
    });
    reload();
    return order;
  }, [reload, restaurantId]);

  useEffect(() => {
    reload();

    const handleQueueChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ restaurantId?: string }>).detail;
      if (!detail?.restaurantId || detail.restaurantId === restaurantId) reload();
    };

    window.addEventListener("pdv-offline-queue:changed", handleQueueChanged);
    window.addEventListener("storage", reload);

    return () => {
      window.removeEventListener("pdv-offline-queue:changed", handleQueueChanged);
      window.removeEventListener("storage", reload);
    };
  }, [reload, restaurantId]);

  useEffect(() => {
    if (isOnline && !isChecking) void syncPendingOrders();
  }, [isChecking, isOnline, syncPendingOrders]);

  return {
    orders,
    pendingCount: orders.filter((order) => order.status !== "error").length,
    errorCount: orders.filter((order) => order.status === "error").length,
    totalCount: orders.length,
    isSyncing: useMemo(() => orders.some((order) => order.status === "syncing"), [orders]),
    enqueueOrder,
    retryOrder,
    removeOrder,
    syncPendingOrders,
  };
}
