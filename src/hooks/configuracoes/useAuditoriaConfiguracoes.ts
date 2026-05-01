import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  AuditAction,
  AuditArea,
  ConfigurationAuditLog,
  listarAuditoriaConfiguracoes,
} from "@/services/configuracoes/auditoriaService";

export const useAuditoriaConfiguracoes = () => {
  const { user } = useCurrentUser();
  const [logs, setLogs] = useState<ConfigurationAuditLog[]>([]);
  const [area, setArea] = useState<AuditArea>("todos");
  const [action, setAction] = useState<AuditAction>("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const carregarAuditoria = useCallback(async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      const data = await listarAuditoriaConfiguracoes({
        restaurantId: user.restaurant_id,
        area,
        action,
        search,
      });
      setLogs(data);
    } catch (error) {
      console.error("Erro ao carregar auditoria de configurações:", error);
      toast.error("Erro ao carregar auditoria");
    } finally {
      setLoading(false);
    }
  }, [action, area, search, user?.restaurant_id]);

  useEffect(() => {
    void carregarAuditoria();
  }, [carregarAuditoria]);

  const summary = useMemo(() => {
    const now = Date.now();
    const last24h = logs.filter((log) => now - new Date(log.created_at).getTime() <= 24 * 60 * 60 * 1000).length;
    const userChanges = logs.filter((log) => log.area === "user").length;
    const systemChanges = logs.filter((log) => log.area === "system").length;

    return {
      total: logs.length,
      last24h,
      userChanges,
      systemChanges,
    };
  }, [logs]);

  return {
    logs,
    area,
    action,
    search,
    loading,
    summary,
    setArea,
    setAction,
    setSearch,
    refetch: carregarAuditoria,
  };
};
