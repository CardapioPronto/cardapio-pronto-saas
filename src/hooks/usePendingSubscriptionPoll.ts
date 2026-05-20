import { useEffect, useMemo } from "react";
import { syncPagarmePendingPayment } from "@/services/pagarmeSubscriptionService";

const POLL_INTERVAL_MS = 8_000;
const POLL_MAX_MS = 5 * 60_000;

/**
 * Consulta Pagar.me e atualiza assinaturas com status pending (boleto/PIX).
 */
export function usePendingSubscriptionPoll(
  pendingSubscriptionIds: string[],
  refetch: () => void | Promise<void>,
) {
  const pendingKey = useMemo(
    () => pendingSubscriptionIds.join("|"),
    [pendingSubscriptionIds],
  );

  useEffect(() => {
    if (pendingSubscriptionIds.length === 0) return;

    const syncAndRefetch = async () => {
      await Promise.all(
        pendingSubscriptionIds.map((id) =>
          syncPagarmePendingPayment(id).catch(() => undefined),
        ),
      );
      await Promise.resolve(refetch());
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
  }, [pendingKey, pendingSubscriptionIds, refetch]);
}
