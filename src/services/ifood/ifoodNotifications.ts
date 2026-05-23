import type { IfoodNotificationPreferences, IfoodPollResult } from "./types";
import { toast } from "@/components/ui/sonner-toast";

export type { IfoodNotificationPreferences };

export function applyIfoodPollNotifications(
  result: IfoodPollResult,
  prefs: IfoodNotificationPreferences,
): void {
  if (prefs.notifyNewOrders && result.ordersImported > 0) {
    const n = result.ordersImported;
    toast.success(
      n === 1
        ? "Novo pedido importado do iFood."
        : `${n} novos pedidos importados do iFood.`,
    );
  }

  const statusUpdates = result.ordersStatusUpdated ?? 0;
  if (prefs.notifyStatusChanges && statusUpdates > 0) {
    toast.info(
      statusUpdates === 1
        ? "Um pedido iFood teve o status atualizado pelo marketplace."
        : `${statusUpdates} pedidos iFood tiveram status atualizado pelo marketplace.`,
    );
  }
}
