import { supabase, getCurrentRestaurantId } from "@/lib/supabase";
import {
  LoyaltyDashboardResponse,
  LoyaltySettingsPatch,
  PublicLoyaltyQuote,
} from "@/types/loyalty";

const EMPTY_DASHBOARD: LoyaltyDashboardResponse = {
  settings: {
    restaurant_id: "",
    enabled: false,
    cashback_percent: 3,
    min_order_value: 0,
    max_redeem_percent: 30,
    credit_valid_days: null,
  },
  metrics: {
    active_balance: 0,
    customers_with_balance: 0,
    total_earned: 0,
    total_redeemed: 0,
  },
  customers: [],
  recent_transactions: [],
};

function normalizeDashboard(value: unknown): LoyaltyDashboardResponse {
  const data = (value ?? {}) as Partial<LoyaltyDashboardResponse>;

  return {
    settings: {
      ...EMPTY_DASHBOARD.settings,
      ...(data.settings ?? {}),
      cashback_percent: Number(data.settings?.cashback_percent ?? 3),
      min_order_value: Number(data.settings?.min_order_value ?? 0),
      max_redeem_percent: Number(data.settings?.max_redeem_percent ?? 30),
      credit_valid_days: data.settings?.credit_valid_days ?? null,
      enabled: data.settings?.enabled === true,
    },
    metrics: {
      ...EMPTY_DASHBOARD.metrics,
      ...(data.metrics ?? {}),
      active_balance: Number(data.metrics?.active_balance ?? 0),
      customers_with_balance: Number(data.metrics?.customers_with_balance ?? 0),
      total_earned: Number(data.metrics?.total_earned ?? 0),
      total_redeemed: Number(data.metrics?.total_redeemed ?? 0),
    },
    customers: Array.isArray(data.customers) ? data.customers : [],
    recent_transactions: Array.isArray(data.recent_transactions) ? data.recent_transactions : [],
  };
}

async function requireRestaurantId() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    throw new Error("Restaurante não encontrado.");
  }
  return restaurantId;
}

export async function getLoyaltyDashboard() {
  const restaurantId = await requireRestaurantId();
  const { data, error } = await supabase.rpc("get_restaurant_loyalty_dashboard", {
    p_restaurant_id: restaurantId,
  });

  if (error) throw error;
  return normalizeDashboard(data);
}

export async function saveLoyaltySettings(patch: LoyaltySettingsPatch) {
  const restaurantId = await requireRestaurantId();
  const { data, error } = await supabase.rpc("save_restaurant_loyalty_settings", {
    p_restaurant_id: restaurantId,
    p_patch: patch as never,
  });

  if (error) throw error;
  return data;
}

export async function getPublicLoyaltyQuote(input: {
  restaurantId: string;
  phone: string;
  orderSubtotal: number;
}): Promise<PublicLoyaltyQuote> {
  const { data, error } = await supabase.rpc("get_public_loyalty_quote", {
    p_restaurant_id: input.restaurantId,
    p_phone: input.phone,
    p_order_subtotal: input.orderSubtotal,
  });

  if (error) throw error;
  const quote = (data ?? {}) as Partial<PublicLoyaltyQuote>;
  return {
    enabled: quote.enabled === true,
    balance: Number(quote.balance ?? 0),
    max_redeem_amount: Number(quote.max_redeem_amount ?? 0),
    earn_estimate: Number(quote.earn_estimate ?? 0),
    cashback_percent: quote.cashback_percent,
    min_order_value: quote.min_order_value,
    max_redeem_percent: quote.max_redeem_percent,
  };
}
