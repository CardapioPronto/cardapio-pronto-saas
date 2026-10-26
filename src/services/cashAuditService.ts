import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CashAuditEvent = Database["public"]["Tables"]["cash_audit_events"]["Row"] & {
  actorName: string | null;
};
export const CASH_AUDIT_PAGE_SIZE = 25;
export interface CashAuditFilters {
  startDate: string;
  endDate: string;
  action: "all" | "payment_method_changed" | "cash_session_closed";
  page: number;
}

export function cashAuditRange(filters: CashAuditFilters) {
  const since = new Date(`${filters.startDate}T00:00:00`);
  const until = new Date(`${filters.endDate}T00:00:00`);
  if (!Number.isFinite(since.getTime()) || !Number.isFinite(until.getTime()) || since > until) {
    throw new Error("Informe um período válido para consultar o histórico.");
  }
  until.setDate(until.getDate() + 1);
  return { since: since.toISOString(), until: until.toISOString() };
}

export async function fetchCashAudit(restaurantId: string, filters: CashAuditFilters) {
  if (!restaurantId) throw new Error("Selecione um restaurante.");
  const { since, until } = cashAuditRange(filters);
  const offset = Math.max(0, Math.floor(filters.page)) * CASH_AUDIT_PAGE_SIZE;
  let query = supabase.from("cash_audit_events").select("*", { count: "exact" })
    .eq("restaurant_id", restaurantId).gte("created_at", since).lt("created_at", until)
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (filters.action !== "all") query = query.eq("event_type", filters.action);
  const { data, error, count } = await query.range(offset, offset + CASH_AUDIT_PAGE_SIZE - 1);
  if (error) throw error;
  const ids = [...new Set((data ?? []).flatMap(row => row.actor_id ? [row.actor_id] : []))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: users, error: usersError } = await supabase.rpc("get_users_basic_info", { _user_ids: ids });
    if (usersError) throw usersError;
    for (const user of users ?? []) names.set(user.id, user.name);
  }
  return {
    events: (data ?? []).map(row => ({ ...row, actorName: row.actor_id ? names.get(row.actor_id) ?? null : null })),
    total: count ?? 0,
  };
}