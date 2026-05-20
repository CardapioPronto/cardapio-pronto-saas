import { useEffect } from "react";

const POLL_INTERVAL_MS = 8_000;
const POLL_MAX_MS = 5 * 60_000;

/**
 * Reconsulta assinatura enquanto status = pending (boleto/PIX aguardando webhook).
 */
export function usePendingSubscriptionPoll(
  status: string | null | undefined,
  refetch: () => void | Promise<void>,
) {
  useEffect(() => {
    if (status !== "pending") return;

    const runRefetch = () => {
      void Promise.resolve(refetch());
    };

    const intervalId = window.setInterval(runRefetch, POLL_INTERVAL_MS);
    const stopId = window.setTimeout(() => {
      window.clearInterval(intervalId);
    }, POLL_MAX_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, [status, refetch]);
}
