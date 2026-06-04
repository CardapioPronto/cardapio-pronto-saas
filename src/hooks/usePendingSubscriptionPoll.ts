import { useEffect, useMemo, useRef } from "react";
import { syncPagarmePendingPayment } from "@/services/pagarmeSubscriptionService";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const POLL_INTERVAL_MS = 8_000;
const POLL_MAX_MS = 5 * 60_000;

/**
 * Consulta Pagar.me e atualiza assinaturas com status pending (boleto/PIX).
 */
export function usePendingSubscriptionPoll(
  pendingSubscriptionIds: string[],
  refetch: () => void | Promise<void>,
) {
  const inFlightRef = useRef(false);
  const { isOnline, isChecking } = useNetworkStatus();

  const pendingKey = useMemo(
    () => [...pendingSubscriptionIds].sort().join("|"),
    [pendingSubscriptionIds],
  );

  useEffect(() => {
    if (!pendingKey || !isOnline || isChecking) return;

    const subscriptionIds = pendingKey.split("|");

    const syncAndRefetch = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await Promise.all(
          subscriptionIds.map((id) =>
            syncPagarmePendingPayment(id).catch(() => undefined),
          ),
        );
        await Promise.resolve(refetch());
      } finally {
        inFlightRef.current = false;
      }
    };

    void syncAndRefetch();

    const intervalId = window.setInterval(() => {
      void syncAndRefetch();
    }, POLL_INTERVAL_MS);
    const stopId = window.setTimeout(() => {
      window.clearInterval(intervalId);
    }, POLL_MAX_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, [isChecking, isOnline, pendingKey, refetch]);
}
