import { supabase } from "@/integrations/supabase/client";
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
  last_order_at: string | null;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  created_at: string;
  sent_at: string | null;
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
  let query = supabase.from("email_templates" as any).select("*").order("category").order("template_key");
  query = scope === "system"
    ? query.is("restaurant_id", null)
    : query.or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as EmailTemplate[];
}

export async function saveEmailTemplate(scope: EmailIntegrationScope, template: Partial<EmailTemplate>) {
  const restaurantId = scope === "restaurant" ? await getCurrentRestaurantId() : null;
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("email_templates" as any)
    .upsert({
      id: scope === "system" || template.restaurant_id ? template.id : undefined,
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

export async function listEmailLogs(scope: EmailIntegrationScope, limit = 50) {
  let query = supabase
    .from("email_send_logs" as any)
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

export async function listEmailContacts(scope: EmailIntegrationScope, limit = 100) {
  if (scope !== "restaurant") return [];
  const restaurantId = await getCurrentRestaurantId();
  const { data, error } = await supabase
    .from("restaurant_email_contacts" as any)
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
    .from("email_campaigns" as any)
    .select("id, name, subject, status, created_at, sent_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as EmailCampaign[];
}
