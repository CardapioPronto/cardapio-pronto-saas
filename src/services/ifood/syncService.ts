import { pollIfoodEvents, updateIfoodOrderStatus } from "./api";
import { applyIfoodPollNotifications } from "./ifoodNotifications";
import type { IfoodNotificationPreferences } from "./types";
import { toast } from "@/components/ui/sonner-toast";
import type { PedidoStatus } from "@/features/pdv/types";

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const syncIfoodPendingOrders = async (
  prefs: IfoodNotificationPreferences = { notifyNewOrders: true, notifyStatusChanges: true },
): Promise<void> => {
  try {
    const result = await pollIfoodEvents();
    applyIfoodPollNotifications(result, prefs);
  } catch (error) {
    console.error("Erro ao sincronizar eventos do iFood:", error);
  }
};

export const startIfoodSync = (
  intervalSeconds = 60,
  prefs: IfoodNotificationPreferences = { notifyNewOrders: true, notifyStatusChanges: true },
): void => {
  stopIfoodSync();
  void syncIfoodPendingOrders(prefs);
  pollingInterval = setInterval(() => void syncIfoodPendingOrders(prefs), intervalSeconds * 1000);
};

export const stopIfoodSync = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

export const updateOrderStatusInIfood = async (
  orderId: string,
  pubfyStatus: PedidoStatus,
  restaurantId?: string,
): Promise<boolean> => {
  try {
    const result = await updateIfoodOrderStatus(orderId, pubfyStatus, restaurantId);
    if (result.skipped) return true;
    if (result.actions?.length) {
      toast.success(`Status enviado ao iFood (${result.actions.join(", ")}).`);
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar status no iFood";
    console.error("updateOrderStatusInIfood:", error);
    toast.error(message);
    return false;
  }
};
