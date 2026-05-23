import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type OrdersRealtimeHandlers = {
  onInsert?: (row: Record<string, unknown>) => void;
  onUpdate?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  /** Recarrega lista/resumo do servidor (debounced pelo hook). */
  onReload?: () => void;
};

const RELOAD_DEBOUNCE_MS = 600;
const POLL_FALLBACK_MS = 20_000;

/**
 * Escuta mudanças na tabela `orders` do restaurante (cozinha, PDV, /pedidos).
 */
export function useOrdersRealtimeSubscription(
  restaurantId: string | undefined | null,
  handlers: OrdersRealtimeHandlers,
  channelId: string,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(handlers);
  const reloadTimerRef = useRef<number | null>(null);
  const realtimeSubscribedRef = useRef(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!restaurantId) return;

    const scheduleReload = () => {
      if (reloadTimerRef.current) window.clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = window.setTimeout(() => {
        reloadTimerRef.current = null;
        handlersRef.current.onReload?.();
      }, RELOAD_DEBOUNCE_MS);
    };

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            handlersRef.current.onInsert?.(payload.new as Record<string, unknown>);
            scheduleReload();
            return;
          }

          if (payload.eventType === "UPDATE") {
            handlersRef.current.onUpdate?.(payload.new as Record<string, unknown>);
            scheduleReload();
            return;
          }

          if (payload.eventType === "DELETE") {
            handlersRef.current.onDelete?.(payload.old as Record<string, unknown>);
            scheduleReload();
          }
        },
      )
      .subscribe((status) => {
        realtimeSubscribedRef.current = status === "SUBSCRIBED";
      });

    channelRef.current = channel;

    const pollInterval = window.setInterval(() => {
      if (!realtimeSubscribedRef.current) scheduleReload();
    }, POLL_FALLBACK_MS);

    return () => {
      window.clearInterval(pollInterval);
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      realtimeSubscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [restaurantId, channelId]);
}
