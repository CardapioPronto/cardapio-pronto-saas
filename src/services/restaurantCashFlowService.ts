import { supabase } from "@/integrations/supabase/client";
import { buildRestaurantCashFlow, financialPeriod, type CashFlowClosing } from "@/lib/restaurantCashFlow";
import type { CashActivityOrder } from "../../supabase/functions/_shared/cash-shift-activity";

export async function fetchRestaurantCashFlow(restaurantId: string, start: string, end: string) {
  if (!restaurantId) throw new Error("Selecione um restaurante.");
  const period = financialPeriod(start, end);
  const activityRequest = supabase.rpc("get_cash_shift_activity", {
    p_restaurant_id: restaurantId, p_since: period.since, p_until: period.until,
  });
  const readClosings = async () => {
    const rows: CashFlowClosing[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("cash_register_sessions")
        .select("id,closed_at,withdrawals").eq("restaurant_id", restaurantId).eq("status", "closed")
        .gte("closed_at", period.since).lt("closed_at", period.until)
        .order("closed_at").order("id").range(offset, offset + 499);
      if (error) throw error;
      for (const item of data ?? []) if (item.closed_at) rows.push({ ...item, closed_at: item.closed_at });
      if (!data || data.length < 500) return rows;
    }
  };
  const [{ data, error }, closings] = await Promise.all([activityRequest, readClosings()]);
  if (error) throw error;
  const activity = data as unknown as { orders: CashActivityOrder[]; since: string; until: string };
  if (!activity || !Array.isArray(activity.orders) || !activity.since || !activity.until) throw new Error("Não foi possível ler o movimento financeiro.");
  return buildRestaurantCashFlow(activity.orders, closings, activity.since, activity.until);
}