import { useEffect, useRef } from "react";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { getIfoodIntegrationConfig } from "@/services/ifood/api";
import {
  applyIfoodPollNotifications,
  type IfoodNotificationPreferences,
} from "@/services/ifood/ifoodNotifications";
import { pollIfoodEvents } from "@/services/ifood/api";
import { stopIfoodSync } from "@/services/ifood/syncService";

/**
 * Polling leve no painel (complementa o pg_cron): enquanto a equipe está logada,
 * consulta eventos iFood no intervalo configurado e exibe toasts conforme preferências.
 */
export function useIfoodBackgroundSync(enabled: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefsRef = useRef<IfoodNotificationPreferences>({
    notifyNewOrders: true,
    notifyStatusChanges: true,
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const clearTimer = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopIfoodSync();
    };

    const tick = async (restaurantId: string) => {
      try {
        const result = await pollIfoodEvents(restaurantId);
        if (!cancelled) {
          applyIfoodPollNotifications(result, prefsRef.current);
        }
      } catch (error) {
        console.error("[ifood-background-sync]", error);
      }
    };

    const bootstrap = async () => {
      try {
        const restaurantId = await getCurrentRestaurantId();
        if (!restaurantId || cancelled) return;

        const { config } = await getIfoodIntegrationConfig(restaurantId);
        if (!config.isEnabled || !config.pollingEnabled || cancelled) return;

        prefsRef.current = {
          notifyNewOrders: config.notifyNewOrders ?? true,
          notifyStatusChanges: config.notifyStatusChanges ?? true,
        };

        const intervalMs = Math.min(300, Math.max(30, config.pollingInterval ?? 60)) * 1000;

        await tick(restaurantId);
        if (cancelled) return;

        intervalRef.current = setInterval(() => {
          void tick(restaurantId);
        }, intervalMs);
      } catch (error) {
        console.error("[ifood-background-sync] bootstrap", error);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [enabled]);
}
