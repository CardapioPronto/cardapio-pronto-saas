import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AlertTriangle, BrainCircuit, MessageCircle, Package, type LucideIcon } from "lucide-react";
import { getOwnerCopilotAlerts } from "@/services/ownerCopilotService";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const REFRESH_INTERVAL_MS = 60_000;

type ThreadNotificationRow = {
  status: string;
  unread_count: number | null;
};

type InstanceNotificationRow = {
  status: string;
  webhook_url: string | null;
};

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
  const { isOnline, isChecking } = useNetworkStatus();
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isOnline || isChecking) {
      setLoading(false);
      return;
    }

    if (!user?.restaurant_id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const copilotAlertsPromise = getOwnerCopilotAlerts().catch((error) => {
        console.warn("Erro ao carregar alertas do Copiloto:", error);
        return null;
      });

      const [ordersResult, threadsResult, instancesResult, copilotAlerts] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", user.restaurant_id)
          .in("status", ["pendente", "preparo", "em-andamento", "pronto", "pending", "preparing", "ready"]),
        supabase
          .from("conversation_threads")
          .select("id, status, unread_count")
          .eq("restaurant_id", user.restaurant_id)
          .neq("status", "closed"),
        supabase
          .from("whatsapp_instances")
          .select("id, status, webhook_url")
          .eq("restaurant_id", user.restaurant_id)
          .eq("is_active", true),
        copilotAlertsPromise,
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (threadsResult.error) throw threadsResult.error;
      if (instancesResult.error) throw instancesResult.error;

      const next: DashboardNotification[] = [];
      const openOrders = ordersResult.count || 0;
      const threads = (threadsResult.data || []) as ThreadNotificationRow[];
      const instances = (instancesResult.data || []) as InstanceNotificationRow[];
      const waitingHuman = threads.filter((thread) => thread.status === "waiting_human").length;
      const unreadMessages = threads.reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0);
      const instancesNeedingAttention = instances.filter((instance) =>
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

      if (copilotAlerts && copilotAlerts.alerts.length > 0) {
        const hasHighPriority = copilotAlerts.alerts.some((alert) => alert.priority === "high");
        const firstAlert = copilotAlerts.alerts[0];

        next.push({
          id: "owner-copilot-alerts",
          title: "Copiloto IA",
          description: firstAlert?.title
            ? `${firstAlert.title}${copilotAlerts.alerts.length > 1 ? " e outras sugestões aguardam revisão." : " aguarda revisão."}`
            : "Há recomendações operacionais aguardando revisão.",
          count: copilotAlerts.alerts.length,
          href: "/copiloto",
          tone: hasHighPriority ? "warning" : "info",
          icon: BrainCircuit,
        });
      }

      setNotifications(next);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isChecking, isOnline, user?.restaurant_id]);

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
