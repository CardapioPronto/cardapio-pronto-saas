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

export interface EmailCampaign {
  id: string;
  restaurant_id: string;
  template_id: string | null;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  status: string;
  audience_filter: {
    type?: "marketing_opt_in" | "recent_customers";
    days?: number;
  };
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

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

export async function listEmailCampaigns(scope: EmailIntegrationScope, limit = 50) {
  if (scope !== "restaurant") return [];
  const restaurantId = await getCurrentRestaurantId();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as EmailCampaign[];
}

export async function saveEmailCampaign(campaign: Partial<EmailCampaign>) {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Restaurante nao encontrado.");
  const { data: userData } = await supabase.auth.getUser();
  const payload = {
    id: campaign.id,
    restaurant_id: restaurantId,
    template_id: campaign.template_id || null,
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
  return data as EmailCampaign;
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

export async function getEmailCampaignMetrics(campaignId: string): Promise<EmailCampaignMetrics> {
  const { data, error } = await supabase
    .from("email_send_logs")
    .select("status")
    .eq("context_type", "campaign")
    .eq("context_id", campaignId)
    .eq("email_type", "marketing");

  if (error) throw error;

  return (data || []).reduce<EmailCampaignMetrics>(
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
    },
  );
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
