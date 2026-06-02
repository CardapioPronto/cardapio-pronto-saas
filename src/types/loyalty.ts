export interface LoyaltySettings {
  restaurant_id: string;
  enabled: boolean;
  cashback_percent: number;
  min_order_value: number;
  max_redeem_percent: number;
  credit_valid_days: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoyaltyMetrics {
  active_balance: number;
  customers_with_balance: number;
  total_earned: number;
  total_redeemed: number;
}

export interface LoyaltyCustomerBalance {
  phone_normalized: string;
  name: string;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  last_transaction_at: string | null;
}

export type LoyaltyTransactionType =
  | "earn"
  | "redeem"
  | "earn_reversal"
  | "redeem_reversal"
  | "adjustment";

export interface LoyaltyTransaction {
  id: string;
  phone_normalized: string;
  customer_name: string;
  order_id: string | null;
  type: LoyaltyTransactionType;
  amount: number;
  description: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface LoyaltyDashboardResponse {
  settings: LoyaltySettings;
  metrics: LoyaltyMetrics;
  customers: LoyaltyCustomerBalance[];
  recent_transactions: LoyaltyTransaction[];
}

export interface LoyaltySettingsPatch {
  enabled: boolean;
  cashback_percent: number;
  min_order_value: number;
  max_redeem_percent: number;
  credit_valid_days: number | null;
}

export interface PublicLoyaltyQuote {
  enabled: boolean;
  balance: number;
  max_redeem_amount: number;
  earn_estimate: number;
  cashback_percent?: number;
  min_order_value?: number;
  max_redeem_percent?: number;
}
