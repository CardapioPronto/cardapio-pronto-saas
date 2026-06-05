import { useEffect, useRef } from "react";
import { RecipientStatus, restaurantRecipientService } from "@/services/restaurantRecipientService";

const POLL_INTERVAL_MS = 30_000;
const MAX_POLLS = 10;

const POLLABLE_STATUSES: RecipientStatus[] = ["registration", "affiliation"];

interface UseRecipientStatusPollOptions {
  restaurantId: string;
  status: RecipientStatus;
  enabled?: boolean;
  onStatusChange?: (status: RecipientStatus) => void;
}

export function useRecipientStatusPoll({
  restaurantId,
  status,
  enabled = true,
  onStatusChange,
}: UseRecipientStatusPollOptions) {
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    if (!restaurantId || !enabled || !POLLABLE_STATUSES.includes(status)) return;

    let cancelled = false;
    let attempts = 0;
    let lastStatus = status;
    let intervalId = 0;

    const stop = () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };

    const poll = async () => {
      if (cancelled || attempts >= MAX_POLLS) {
        stop();
        return;
      }
      attempts += 1;

      try {
        const data = await restaurantRecipientService.syncStatus(restaurantId);
        if (cancelled) return;

        const newStatus = data.recipient_status;
        if (newStatus !== lastStatus) {
          lastStatus = newStatus;
          onStatusChangeRef.current?.(newStatus);
        }

        if (!POLLABLE_STATUSES.includes(newStatus) || attempts >= MAX_POLLS) {
          stop();
        }
      } catch {
        if (attempts >= MAX_POLLS) stop();
      }
    };

    intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    void poll();

    return stop;
  }, [restaurantId, status, enabled]);
}
