import { supabase } from "@/integrations/supabase/client";
import { buildClosingReport } from "@/lib/cashClosingReport";
import type { CashRegisterSession } from "@/services/cashRegisterService";

export async function fetchClosingReport(restaurantId: string, sessionId: string) {
  if (!restaurantId || !sessionId) throw new Error("Selecione um fechamento.");
  const { data, error } = await supabase.from("cash_register_sessions").select("*")
    .eq("restaurant_id", restaurantId).eq("id", sessionId).eq("status", "closed").single();
  if (error) throw error;
  const names = new Map<string, string>();
  const ids = [...new Set([data.opened_by, data.closed_by].filter((id): id is string => Boolean(id)))];
  let actorWarning = false;
  if (ids.length) {
    const result = await supabase.rpc("get_users_basic_info", { _user_ids: ids });
    if (result.error) actorWarning = true;
    else for (const user of result.data ?? []) names.set(user.id, user.name);
  }
  const report = buildClosingReport(data as CashRegisterSession, names);
  if (actorWarning) report.warnings.push("Não foi possível consultar os nomes dos responsáveis.");
  return report;
}