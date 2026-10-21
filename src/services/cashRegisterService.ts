import { supabase } from "@/integrations/supabase/client";
import { summarizeCashActivity, type CashActivityOrder } from "../../supabase/functions/_shared/cash-shift-activity";

export interface CashRegisterSession {
  id: string;
  restaurant_id: string;
  opened_by: string;
  opened_at: string;
  opening_amount: number;
  status: "open" | "closed";
  closed_at: string | null;
  system_orders_count: number;
  system_sales_total: number;
  system_received_total: number | null;
  system_pending_total: number | null;
  system_external_total: number | null;
  declared_cash: number;
  declared_pix: number;
  declared_credit: number;
  declared_debit: number;
  declared_voucher: number;
  withdrawals: number;
  card_machine_provider: string | null;
  card_machine_batch: string | null;
  difference_amount: number;
  notes: string | null;
  ai_review: unknown | null;
  ai_reviewed_at: string | null;
}

// Tabela nova ainda não presente nos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("cash_register_sessions");

export const fetchOpenSession = async (restaurantId: string) => {
  const { data, error } = await table()
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CashRegisterSession | null;
};

export const fetchRecentSessions = async (restaurantId: string) => {
  const { data, error } = await table()
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(15);
  if (error) throw error;
  return (data ?? []) as CashRegisterSession[];
};

export const openSession = async (restaurantId: string, openingAmount: number) => {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await table()
    .insert({
      restaurant_id: restaurantId,
      opening_amount: openingAmount,
      opened_by: auth.user?.id,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CashRegisterSession;
};

export type SessionOrder = CashActivityOrder;

export const fetchSessionSales = async (restaurantId: string, since: string) => {
  const { data, error } = await supabase.rpc("get_cash_shift_activity", {
    p_restaurant_id: restaurantId, p_since: since,
  });
  if (error) throw error;
  const activity = data as unknown as { orders: SessionOrder[]; since: string; until: string };
  if (!activity || !Array.isArray(activity.orders) || !activity.until) throw new Error("Resposta inválida da conferência do turno");
  return summarizeCashActivity(activity.orders, activity.since, activity.until);
};

export const closeSession = async (
  sessionId: string,
  payload: Partial<CashRegisterSession>,
) => {
  const { error } = await table()
    .update({ ...payload, status: "closed" })
    .eq("id", sessionId)
    .eq("status", "open");
  if (error) throw error;
};
