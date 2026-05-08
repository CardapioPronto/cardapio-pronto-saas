import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { PedidoStatus } from "@/features/pdv/types";
import { listKitchenOrders, updateKitchenOrderStatus } from "./kitchenService";
import { KITCHEN_QUEUE_STATUSES, type KitchenOrder } from "./types";

const SOUND_STORAGE_KEY = "pubfy:kitchen-sound-enabled";

const shouldNotifyOrder = (order: { source?: string | null; order_type?: string | null }) =>
  order.order_type === "delivery" ||
  ["cardapio", "ifood", "whatsapp"].includes(order.source || "");

export function useKitchenOrders(restaurantId?: string | null) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === "true";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reloadRef = useRef<() => void>(() => undefined);

  const loadOrders = useCallback(async () => {
    if (!restaurantId) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      setOrders(await listKitchenOrders(restaurantId));
    } catch (error) {
      console.error("Erro ao carregar pedidos da cozinha:", error);
      toast.error("Erro ao carregar a fila da cozinha");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    reloadRef.current = () => {
      void loadOrders();
    };
  }, [loadOrders]);

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;

    if (!audioRef.current) {
      audioRef.current = new Audio("/notification.mp3");
      audioRef.current.preload = "auto";
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      toast.info("Clique em Ativar som para liberar as notificações sonoras.");
    });
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));

    if (enabled) {
      const audio = new Audio("/notification.mp3");
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audioRef.current = audio;
        toast.success("Som da cozinha ativado");
      }).catch(() => {
        toast.info("O navegador bloqueou o teste de som. Tente novamente após interagir com a tela.");
      });
    }
  }, []);

  const changeStatus = useCallback(async (orderId: string, status: PedidoStatus) => {
    setUpdatingId(orderId);
    try {
      const result = await updateKitchenOrderStatus(orderId, status);
      if (result.success) {
        setOrders((current) => current.map((order) =>
          order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
        ).filter((order) => KITCHEN_QUEUE_STATUSES.includes(order.status)));
      }
      return result;
    } finally {
      setUpdatingId(null);
    }
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    void loadOrders();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`kitchen-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          reloadRef.current();

          if (payload.eventType === "INSERT") {
            const nextOrder = payload.new as { total?: number; source?: string | null; order_type?: string | null };
            if (shouldNotifyOrder(nextOrder)) playNotification();
            toast.success("Novo pedido na cozinha", {
              description: nextOrder.source === "ifood"
                ? "Pedido recebido pelo iFood"
                : nextOrder.source === "whatsapp"
                  ? "Pedido recebido pelo WhatsApp"
                  : "Pedido recebido pelo sistema",
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          toast.error("Conexão em tempo real da cozinha falhou. A tela seguirá atualizando automaticamente.");
        }
      });

    channelRef.current = channel;

    const interval = window.setInterval(() => {
      reloadRef.current();
    }, 20000);

    return () => {
      window.clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [restaurantId, loadOrders, playNotification]);

  const summary = useMemo(() => ({
    waiting: orders.filter((order) => order.status === "pendente").length,
    preparing: orders.filter((order) => order.status === "preparo" || order.status === "em-andamento").length,
    ready: orders.filter((order) => order.status === "pronto").length,
    delivery: orders.filter((order) => order.orderType === "delivery" || ["ifood", "whatsapp"].includes(order.source || "")).length,
  }), [orders]);

  return {
    orders,
    loading,
    updatingId,
    soundEnabled,
    setSoundEnabled,
    changeStatus,
    refresh: loadOrders,
    summary,
  };
}
