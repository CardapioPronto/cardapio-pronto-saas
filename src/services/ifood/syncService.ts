import { pollIfoodEvents, updateIfoodOrderStatus } from "./api";
import { toast } from "@/components/ui/sonner-toast";
import type { PedidoStatus } from "@/features/pdv/types";

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const syncIfoodPendingOrders = async (): Promise<void> => {
  try {
    const result = await pollIfoodEvents();
    if (result.ordersImported > 0) {
      toast.success(
        `${result.ordersImported} ${result.ordersImported === 1 ? "pedido importado" : "pedidos importados"} do iFood.`,
      );
    }
  } catch (error) {
    console.error("Erro ao sincronizar eventos do iFood:", error);
  }
};

export const startIfoodSync = (): void => {
  stopIfoodSync();
  void syncIfoodPendingOrders();
  pollingInterval = setInterval(syncIfoodPendingOrders, 30000);
};

export const stopIfoodSync = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

export const updateOrderStatusInIfood = async (): Promise<boolean> => {
  toast.error("Atualização de status no iFood ainda não está habilitada.");
  return false;
};
