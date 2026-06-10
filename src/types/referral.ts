export type ReferralProgramPublicSettings = {
  program_enabled: boolean;
  accepting_new_referrals: boolean;
  show_pause_message: boolean;
  paused_message: string | null;
  paused_until: string | null;
  attribution_window_days: number;
  min_payout_amount: number;
  default_commission_percent_monthly: number;
  default_commission_percent_yearly: number;
  terms_version: string;
  terms_content: string | null;
};

export type AffiliateProfile = {
  user_id: string;
  referral_code: string;
  status: "active" | "suspended";
  display_name: string | null;
  terms_accepted_at: string | null;
  payout_pix_key: string | null;
};

export type ReferralProgramSettingsDraft = {
  program_enabled: boolean;
  accepting_new_referrals: boolean;
  accrual_enabled: boolean;
  paused_message: string;
  paused_until: string | null;
  default_commission_percent_monthly: number;
  default_commission_percent_yearly: number;
  attribution_window_days: number;
  hold_days_before_approval: number;
  min_payout_amount: number;
  terms_version: string;
  terms_content: string;
};

export type AffiliateCampaignMaterial = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  material_type: "image" | "pdf" | "copy" | "video_link";
  storage_path: string | null;
  external_url: string | null;
  copy_template: string | null;
  sort_order: number;
  is_active?: boolean;
  visible_from?: string | null;
  visible_until?: string | null;
};

export type AffiliateDashboard = {
  has_profile: boolean;
  profile?: AffiliateProfile & { document_cpf?: string | null };
  balances?: {
    pending_cents: number;
    approved_cents: number;
    paid_cents: number;
    min_payout_cents: number;
  };
  open_payout_request?: {
    id: string;
    amount_cents: number;
    status: string;
    requested_at: string;
  } | null;
  referrals?: Array<{
    restaurant_id: string;
    restaurant_name: string;
    attributed_at: string;
    referral_code: string;
    subscription_status: string | null;
    billing_cycle: string | null;
  }>;
  recent_commissions?: Array<{
    id: string;
    restaurant_id: string;
    commission_amount_cents: number;
    status: string;
    billing_cycle: string | null;
    restaurant_paid_at: string | null;
    created_at: string;
  }>;
  payout_history?: Array<{
    id: string;
    amount_cents: number;
    status: string;
    requested_at: string;
    paid_at: string | null;
  }>;
};

export type AffiliateMaterialDraft = {
  id?: string;
  title: string;
  description?: string;
  category: string;
  material_type: AffiliateCampaignMaterial["material_type"];
  storage_path?: string;
  external_url?: string;
  copy_template?: string;
  sort_order: number;
  is_active: boolean;
};
