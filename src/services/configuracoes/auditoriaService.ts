import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AuditLogRow = Database["public"]["Tables"]["configuration_audit_logs"]["Row"];

export type AuditArea = "todos" | "establishment" | "system" | "user";
export type AuditAction = "todos" | "update" | "password_change";

export interface AuditUserInfo {
  id: string;
  name: string;
  email: string;
}

export interface ConfigurationAuditLog extends AuditLogRow {
  actor?: AuditUserInfo | null;
  targetUser?: AuditUserInfo | null;
}

export interface ListarAuditoriaConfiguracoesParams {
  restaurantId: string;
  area?: AuditArea;
  action?: AuditAction;
  search?: string;
  limit?: number;
}

export async function listarAuditoriaConfiguracoes({
  restaurantId,
  area = "todos",
  action = "todos",
  search = "",
  limit = 80,
}: ListarAuditoriaConfiguracoesParams): Promise<ConfigurationAuditLog[]> {
  let query = supabase
    .from("configuration_audit_logs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (area !== "todos") {
    query = query.eq("area", area);
  }

  if (action !== "todos") {
    query = query.eq("action", action);
  }

  const { data, error } = await query;

  if (error) throw error;

  const logs = data ?? [];
  const userIds = Array.from(
    new Set(
      logs
        .flatMap((log) => [log.actor_user_id, log.target_user_id])
        .filter((id): id is string => Boolean(id))
    )
  );

  const usersById = new Map<string, AuditUserInfo>();

  if (userIds.length > 0) {
    const { data: usersData, error: usersError } = await supabase.rpc("get_users_basic_info", {
      _user_ids: userIds,
    });

    if (usersError) throw usersError;

    for (const user of usersData ?? []) {
      usersById.set(user.id, {
        id: user.id,
        name: user.name || user.email || "Usuário",
        email: user.email,
      });
    }
  }

  const hydratedLogs = logs.map((log) => ({
    ...log,
    actor: log.actor_user_id ? usersById.get(log.actor_user_id) ?? null : null,
    targetUser: log.target_user_id ? usersById.get(log.target_user_id) ?? null : null,
  }));

  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return hydratedLogs;

  return hydratedLogs.filter((log) => {
    const searchable = [
      log.actor?.name,
      log.actor?.email,
      log.targetUser?.name,
      log.targetUser?.email,
      log.area,
      log.action,
      log.entity_type,
      log.changed_fields.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });
}
