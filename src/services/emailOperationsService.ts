import { supabase } from "@/integrations/supabase/client";
import { fetchPublicPlanSummaryById } from "./publicPlansService";
import { EmailIntegrationScope } from "./emailIntegrationService";

export interface EmailTemplate {
  id: string;
  restaurant_id: string | null;
  template_key: string;
  name: string;
  description: string | null;
  category: "transactional" | "operational" | "marketing";
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: string[];
  is_enabled: boolean;
  updated_at: string;
}

export interface EmailSendLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  email_type: string;
  template_key: string | null;
  provider_message_id: string | null;
  diagnostic_status: string | null;
  diagnostic_message: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
}

export interface EmailContact {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  accepts_marketing: boolean;
  unsubscribed_at: string | null;
  last_order_at: string | null;
  created_at: string;
}

export interface EmailCampaignCategory {
  id: string;
  name: string;
}

export interface EmailCampaign {
  id: string;
  restaurant_id: string;
  template_id: string | null;
  coupon_id: string | null;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  status: string;
  audience_filter: {
    type?:
      | "marketing_opt_in"
      | "recent_customers"
      | "inactive_customers"
      | "first_order_no_repurchase"
      | "high_ticket"
      | "loyalty_balance"
      | "purchased_category"
      | "birthday";
    days?: number;
    categoryId?: string;
  };
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  coupon?: EmailCampaignCoupon | null;
}

export interface EmailCampaignCoupon {
  id: string;
  code: string;
  title: string;
  discount_type: string;
  discount_value: number;
  valid_until: string | null;
  minimum_order_value: number | null;
}

export interface EmailCampaignCouponConfig {
  discountType: "percentage" | "fixed";
  discountValue: number;
  validDays: number;
  minimumOrderValue: number;
}

type EmailCampaignRowWithCoupon = EmailCampaign & {
  coupons?: {
    id: string;
    code: string;
    title: string;
    discount_type: string;
    discount_value: number;
    valid_until: string | null;
    minimum_order_value: number | null;
  } | null;
};

export interface EmailCampaignEntitlement {
  planName: string;
  campaignsEnabled: boolean;
  monthlyLimit: number;
  contactLimit: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  customTemplatesEnabled: boolean;
}

export interface EmailCampaignMetrics {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  ordersCount: number;
  finalizedOrdersCount: number;
  attributedRevenue: number;
  discountAmount: number;
}

export interface EmailCampaignAudiencePreviewContact {
  id: string;
  email: string;
  name: string | null;
  last_order_at: string | null;
}

export interface EmailCampaignAudiencePreview {
  recipientCount: number;
  sample: EmailCampaignAudiencePreviewContact[];
  monthlyLimit: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  cappedAt: number;
  contactLimit: number;
}

async function getCurrentRestaurantId() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("users")
    .select("restaurant_id")
    .eq("id", userData.user.id)
    .maybeSingle();
  return data?.restaurant_id ?? null;
}

export async function listEmailTemplates(scope: EmailIntegrationScope) {
  const restaurantId = scope === "restaurant" ? await getCurrentRestaurantId() : null;
  let query = supabase.from("email_templates").select("*").order("category").order("template_key");
  query = scope === "system"
    ? query.is("restaurant_id", null)
    : query.eq("restaurant_id", restaurantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as EmailTemplate[];
}

export async function saveEmailTemplate(scope: EmailIntegrationScope, template: Partial<EmailTemplate>) {
  const restaurantId = scope === "restaurant" ? await getCurrentRestaurantId() : null;
  if (scope === "restaurant" && !restaurantId) {
    throw new Error("Restaurante nao encontrado para salvar o template.");
  }
  if (scope === "restaurant" && !template.restaurant_id) {
    throw new Error("Templates globais do Pubfy devem ser gerenciados no dashboard de super admin.");
  }
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("email_templates")
    .upsert({
      id: template.id,
      restaurant_id: restaurantId,
      template_key: template.template_key,
      name: template.name,
      description: template.description,
      category: template.category || "transactional",
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content,
      variables: template.variables || [],
      is_enabled: template.is_enabled ?? true,
      updated_by: userData.user?.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as EmailTemplate;
}

export async function copyAllowedEmailTemplate(templateKey: "order_confirmation" | "campaign_basic") {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Restaurante nao encontrado.");

  const { data, error } = await supabase.functions.invoke("email-dispatch", {
    body: {
      action: "copy_allowed_template",
      restaurant_id: restaurantId,
      template_key: templateKey,
    },
  });

  if (error) throw error;
  if (data?.success === false) throw new Error(data.error || "Erro ao copiar template");
  return data.template as EmailTemplate;
}

export async function listEmailLogs(scope: EmailIntegrationScope, limit = 50) {
  let query = supabase
    .from("email_send_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scope === "restaurant") {
    const restaurantId = await getCurrentRestaurantId();
    query = query.eq("restaurant_id", restaurantId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as EmailSendLog[];
}

export async function listEmailContacts(scope: EmailIntegrationScope, limit = 500) {
  if (scope !== "restaurant") return [];
  const restaurantId = await getCurrentRestaurantId();
  const { data, error } = await supabase
    .from("restaurant_email_contacts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as EmailContact[];
}

export async function listEmailCampaignCategories(scope: EmailIntegrationScope) {
  if (scope !== "restaurant") return [];
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .order("order_position", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as EmailCampaignCategory[];
}

export async function listEmailCampaigns(scope: EmailIntegrationScope, limit = 50) {
  if (scope !== "restaurant") return [];
  const restaurantId = await getCurrentRestaurantId();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*, coupons(id, code, title, discount_type, discount_value, valid_until, minimum_order_value)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data || []) as unknown as EmailCampaignRowWithCoupon[];
  return rows.map((campaign) => ({
    ...campaign,
    coupon: campaign.coupons
      ? {
          id: campaign.coupons.id,
          code: campaign.coupons.code,
          title: campaign.coupons.title,
          discount_type: campaign.coupons.discount_type,
          discount_value: Number(campaign.coupons.discount_value || 0),
          valid_until: campaign.coupons.valid_until,
          minimum_order_value: campaign.coupons.minimum_order_value,
        }
      : null,
  })) as EmailCampaign[];
}

export async function saveEmailCampaign(campaign: Partial<EmailCampaign>) {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Restaurante nao encontrado.");
  const { data: userData } = await supabase.auth.getUser();
  const payload = {
    id: campaign.id,
    restaurant_id: restaurantId,
    template_id: campaign.template_id || null,
    coupon_id: campaign.coupon_id || null,
    name: campaign.name || "Nova campanha",
    subject: campaign.subject || "",
    html_content: campaign.html_content || "",
    text_content: campaign.text_content || null,
    audience_filter: campaign.audience_filter || { type: "marketing_opt_in" },
    status: campaign.status || "draft",
    created_by: userData.user?.id,
  };

  const { data, error } = await supabase
    .from("email_campaigns")
    .upsert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return {
    ...(data as EmailCampaign),
    coupon: campaign.coupon ?? null,
  };
}

export async function generateEmailCampaignCoupon(
  campaignId: string,
  config: EmailCampaignCouponConfig = {
    discountType: "percentage",
    discountValue: 10,
    validDays: 30,
    minimumOrderValue: 0,
  },
): Promise<EmailCampaignCoupon> {
  const { data, error } = await supabase.rpc("generate_email_campaign_coupon", {
    p_campaign_id: campaignId,
    p_discount_type: config.discountType,
    p_discount_value: config.discountValue,
    p_valid_days: config.validDays,
    p_minimum_order_value: config.minimumOrderValue,
  });

  if (error) throw error;
  const value = (data ?? {}) as {
    coupon_id?: string;
    code?: string;
    title?: string;
    discount_type?: string;
    discount_value?: number;
    valid_until?: string | null;
    minimum_order_value?: number | null;
  };

  if (!value.coupon_id || !value.code) {
    throw new Error("Resposta invalida ao gerar cupom.");
  }

  return {
    id: value.coupon_id,
    code: value.code,
    title: value.title || "Cupom da campanha",
    discount_type: value.discount_type || "percentage",
    discount_value: Number(value.discount_value || 0),
    valid_until: value.valid_until ?? null,
    minimum_order_value: value.minimum_order_value ?? null,
  };
}

export async function sendEmailCampaign(campaignId: string) {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Restaurante nao encontrado.");

  const { data, error } = await supabase.functions.invoke("email-dispatch", {
    body: {
      action: "send_campaign",
      restaurant_id: restaurantId,
      campaign_id: campaignId,
    },
  });

  if (error) throw error;
  if (data?.success === false) throw new Error(data.error || "Erro ao enviar campanha");
  return data as {
    success: true;
    sent: number;
    failed: number;
    recipient_count: number;
    monthly_limit: number;
    used_this_month: number;
    remaining_after: number;
    capped_at: number;
  };
}

export async function previewEmailCampaignAudience(campaign: Partial<EmailCampaign>): Promise<EmailCampaignAudiencePreview> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Restaurante nao encontrado.");

  const { data, error } = await supabase.functions.invoke("email-dispatch", {
    body: {
      action: "preview_campaign_audience",
      restaurant_id: restaurantId,
      campaign_id: campaign.id?.startsWith("new-") ? undefined : campaign.id,
      audience_filter: campaign.audience_filter || { type: "marketing_opt_in" },
    },
  });

  if (error) throw error;
  if (data?.success === false) throw new Error(data.error || "Erro ao calcular publico");

  return {
    recipientCount: Number(data?.recipient_count || 0),
    sample: Array.isArray(data?.sample) ? data.sample as EmailCampaignAudiencePreviewContact[] : [],
    monthlyLimit: Number(data?.monthly_limit || 0),
    usedThisMonth: Number(data?.used_this_month || 0),
    remainingThisMonth: Number(data?.remaining_this_month || 0),
    cappedAt: Number(data?.capped_at || 0),
    contactLimit: Number(data?.contact_limit || 0),
  };
}

export async function getEmailCampaignMetrics(campaignId: string): Promise<EmailCampaignMetrics> {
  const { data, error } = await supabase
    .from("email_send_logs")
    .select("status")
    .eq("context_type", "campaign")
    .eq("context_id", campaignId)
    .eq("email_type", "marketing");

  if (error) throw error;

  const deliveryMetrics = (data || []).reduce<EmailCampaignMetrics>(
    (metrics, row: { status: string }) => {
      metrics.total += 1;
      if (row.status in metrics) {
        metrics[row.status as keyof EmailCampaignMetrics] += 1;
      }
      return metrics;
    },
    {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      failed: 0,
      ordersCount: 0,
      finalizedOrdersCount: 0,
      attributedRevenue: 0,
      discountAmount: 0,
    },
  );

  const { data: attributionData, error: attributionError } = await supabase.rpc(
    "get_email_campaign_attribution_metrics",
    { p_campaign_id: campaignId },
  );

  if (attributionError) throw attributionError;
  const attribution = (attributionData ?? {}) as {
    orders_count?: number;
    finalized_orders_count?: number;
    attributed_revenue?: number;
    discount_amount?: number;
  };

  return {
    ...deliveryMetrics,
    ordersCount: Number(attribution.orders_count || 0),
    finalizedOrdersCount: Number(attribution.finalized_orders_count || 0),
    attributedRevenue: Number(attribution.attributed_revenue || 0),
    discountAmount: Number(attribution.discount_amount || 0),
  };
}

export async function getEmailCampaignEntitlement(): Promise<EmailCampaignEntitlement> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return {
      planName: "Sem restaurante",
      campaignsEnabled: false,
      monthlyLimit: 0,
      contactLimit: 0,
      usedThisMonth: 0,
      remainingThisMonth: 0,
      customTemplatesEnabled: false,
    };
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("plan_id, status, start_date, created_at")
    .eq("restaurant_id", restaurantId)
    .in("status", ["active", "trialing", "past_due"])
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);

  const subscription = subscriptions?.[0];
  if (!subscription?.plan_id) {
    return {
      planName: "Sem plano ativo",
      campaignsEnabled: false,
      monthlyLimit: 0,
      contactLimit: 0,
      usedThisMonth: 0,
      remainingThisMonth: 0,
      customTemplatesEnabled: false,
    };
  }

  const plan = await fetchPublicPlanSummaryById(subscription.plan_id);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("email_send_logs")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("email_type", "marketing")
    .gte("created_at", monthStart.toISOString());

  const monthlyLimit = Number(plan?.email_campaign_monthly_limit || 0);
  const usedThisMonth = count || 0;

  return {
    planName: plan?.name || "Plano atual",
    campaignsEnabled: !!plan?.email_campaigns_enabled,
    monthlyLimit,
    contactLimit: Number(plan?.email_campaign_contact_limit || 0),
    usedThisMonth,
    remainingThisMonth: Math.max(0, monthlyLimit - usedThisMonth),
    customTemplatesEnabled: !!plan?.email_custom_templates_enabled,
  };
}
