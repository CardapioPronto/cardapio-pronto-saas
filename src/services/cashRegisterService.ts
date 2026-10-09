import { supabase } from "@/integrations/supabase/client";

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
}

// Tabela nova ainda não presente nos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("cash_register_sessions");

const CANCELED = new Set(["cancelled", "canceled", "cancelado", "cancelada"]);

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

/** Vendas do sistema (pedidos não cancelados) desde a abertura do caixa. */
export const fetchSessionSales = async (restaurantId: string, since: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("total, status")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", since);
  if (error) throw error;
  const valid = (data ?? []).filter((order) => !CANCELED.has(String(order.status ?? "").toLowerCase()));
  return {
    count: valid.length,
    total: Math.round(valid.reduce((sum, order) => sum + Number(order.total ?? 0), 0) * 100) / 100,
  };
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
