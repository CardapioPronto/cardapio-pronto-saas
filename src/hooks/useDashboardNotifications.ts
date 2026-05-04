import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AlertTriangle, MessageCircle, Package, type LucideIcon } from "lucide-react";

const db = supabase as any;
const REFRESH_INTERVAL_MS = 60_000;

export interface DashboardNotification {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  tone: "info" | "warning" | "danger";
  icon: LucideIcon;
}

export function useDashboardNotifications() {
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.restaurant_id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const [ordersResult, threadsResult, instancesResult] = await Promise.all([
        db
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", user.restaurant_id)
          .in("status", ["pendente", "preparo", "em-andamento", "pending", "preparing"]),
        db
          .from("conversation_threads")
          .select("id, status, unread_count")
          .eq("restaurant_id", user.restaurant_id)
          .neq("status", "closed"),
        db
          .from("whatsapp_instances")
          .select("id, status, webhook_url")
          .eq("restaurant_id", user.restaurant_id)
          .eq("is_active", true),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (threadsResult.error) throw threadsResult.error;
      if (instancesResult.error) throw instancesResult.error;

      const next: DashboardNotification[] = [];
      const openOrders = ordersResult.count || 0;
      const threads = threadsResult.data || [];
      const instances = instancesResult.data || [];
      const waitingHuman = threads.filter((thread: any) => thread.status === "waiting_human").length;
      const unreadMessages = threads.reduce((sum: number, thread: any) => sum + Number(thread.unread_count || 0), 0);
      const instancesNeedingAttention = instances.filter((instance: any) =>
        instance.status !== "CONNECTED" || !instance.webhook_url
      ).length;

      if (openOrders > 0) {
        next.push({
          id: "open-orders",
          title: "Pedidos em aberto",
          description: "Pedidos pendentes ou em preparo precisam de acompanhamento.",
          count: openOrders,
          href: "/pedidos",
          tone: "info",
          icon: Package,
        });
      }

      if (waitingHuman > 0 || unreadMessages > 0) {
        next.push({
          id: "whatsapp-attendance",
          title: "Atendimento WhatsApp",
          description: waitingHuman > 0
            ? "Há conversas aguardando atendimento humano."
            : "Há mensagens não lidas nas conversas.",
          count: waitingHuman || unreadMessages,
          href: "/atendimento",
          tone: waitingHuman > 0 ? "warning" : "info",
          icon: MessageCircle,
        });
      }

      if (instancesNeedingAttention > 0) {
        next.push({
          id: "whatsapp-instances",
          title: "Instâncias WhatsApp",
          description: "Existe instância desconectada ou sem webhook configurado.",
          count: instancesNeedingAttention,
          href: "/atendimento",
          tone: "danger",
          icon: AlertTriangle,
        });
      }

      setNotifications(next);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.restaurant_id]);

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, REFRESH_INTERVAL_MS);

    const handleVisible = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };

    window.addEventListener("focus", loadNotifications);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.reduce((sum, notification) => sum + notification.count, 0),
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    refresh: loadNotifications,
  };
}
