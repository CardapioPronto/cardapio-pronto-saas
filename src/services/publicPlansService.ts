import { supabase } from "@/integrations/supabase/client";

export type PublicPlanFeature = {
  feature: string;
  is_enabled: boolean;
};

export type PublicPlanSummary = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  trial_days: number | null;
  email_campaigns_enabled: boolean;
  email_campaign_monthly_limit: number;
  email_campaign_contact_limit: number;
  email_custom_templates_enabled: boolean;
  features: PublicPlanFeature[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toFeature = (value: unknown): PublicPlanFeature | null => {
  if (!isRecord(value)) return null;
  const feature = String(value.feature ?? "").trim();
  if (!feature) return null;
  return {
    feature,
    is_enabled: Boolean(value.is_enabled),
  };
};

const toPlan = (value: unknown): PublicPlanSummary | null => {
  if (!isRecord(value)) return null;
  const id = String(value.id ?? "").trim();
  const name = String(value.name ?? "").trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    description: typeof value.description === "string" ? value.description : null,
    price_monthly: Number(value.price_monthly ?? 0),
    price_yearly: Number(value.price_yearly ?? 0),
    is_active: Boolean(value.is_active),
    trial_days: value.trial_days === null || value.trial_days === undefined
      ? null
      : Number(value.trial_days),
    email_campaigns_enabled: Boolean(value.email_campaigns_enabled),
    email_campaign_monthly_limit: Number(value.email_campaign_monthly_limit ?? 0),
    email_campaign_contact_limit: Number(value.email_campaign_contact_limit ?? 0),
    email_custom_templates_enabled: Boolean(value.email_custom_templates_enabled),
    features: Array.isArray(value.features)
      ? value.features.map(toFeature).filter((feature): feature is PublicPlanFeature => !!feature)
      : [],
  };
};

export async function fetchPublicPlanSummaries(): Promise<PublicPlanSummary[]> {
  const { data, error } = await supabase.rpc("get_public_plan_summaries");
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map(toPlan).filter((plan): plan is PublicPlanSummary => !!plan);
}

export async function fetchPublicPlanSummaryById(planId: string): Promise<PublicPlanSummary | null> {
  const plans = await fetchPublicPlanSummaries();
  return plans.find((plan) => plan.id === planId) ?? null;
}
