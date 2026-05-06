import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

export type SupabaseAdmin = ReturnType<typeof createClient>;

export interface ManagedEmailInput {
  admin: SupabaseAdmin;
  restaurantId?: string | null;
  templateKey?: string;
  emailType?: "transactional" | "operational" | "marketing" | "test";
  to: string;
  recipientName?: string | null;
  variables?: Record<string, unknown>;
  subject?: string;
  html?: string;
  text?: string;
  contextType?: string;
  contextId?: string | null;
  metadata?: Record<string, unknown>;
  preferRestaurantConfig?: boolean;
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const render = (template: string, variables: Record<string, unknown>, escape = true) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    const value = key.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object" && part in acc) return (acc as Record<string, unknown>)[part];
      return "";
    }, variables);
    return escape ? escapeHtml(value) : String(value ?? "");
  });

const getEmailConfig = async (
  admin: SupabaseAdmin,
  restaurantId?: string | null,
  preferRestaurantConfig = false,
) => {
  const scopes: Array<string | null> = preferRestaurantConfig && restaurantId
    ? [restaurantId, null]
    : [null];

  for (const scope of scopes) {
    const query = admin
      .from("email_settings")
      .select("api_key, from_name, from_email, reply_to, is_enabled")
      .eq("provider", "resend");

    const { data, error } = scope
      ? await query.eq("restaurant_id", scope).maybeSingle()
      : await query.is("restaurant_id", null).maybeSingle();

    if (error) throw error;
    if (data?.is_enabled && data?.api_key && data.api_key !== "configure-via-admin") {
      return data;
    }
  }

  const fallbackKey = Deno.env.get("RESEND_API_KEY");
  if (!fallbackKey) throw new Error("Resend não configurado");

  return {
    api_key: fallbackKey,
    from_name: Deno.env.get("RESEND_FROM_NAME") || "Pubfy",
    from_email: Deno.env.get("RESEND_FROM_EMAIL") || "contato@mail.pubfy.com.br",
    reply_to: Deno.env.get("RESEND_REPLY_TO") || "contato@pubfy.com.br",
    is_enabled: true,
  };
};

const loadTemplate = async (
  admin: SupabaseAdmin,
  templateKey?: string,
  restaurantId?: string | null,
) => {
  if (!templateKey) return null;

  if (restaurantId) {
    const { data, error } = await admin
      .from("email_templates")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("template_key", templateKey)
      .eq("is_enabled", true)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data, error } = await admin
    .from("email_templates")
    .select("*")
    .is("restaurant_id", null)
    .eq("template_key", templateKey)
    .eq("is_enabled", true)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export async function sendManagedEmail(input: ManagedEmailInput) {
  const variables = input.variables || {};
  const template = await loadTemplate(input.admin, input.templateKey, input.restaurantId);
  const config = await getEmailConfig(input.admin, input.restaurantId, input.preferRestaurantConfig);

  const subject = input.subject || render(template?.subject || "", variables, true);
  const html = input.html || render(template?.html_content || "", variables, true);
  const text = input.text || (template?.text_content ? render(template.text_content, variables, false) : stripHtml(html));

  if (!subject || !html) throw new Error("Assunto e conteúdo do e-mail são obrigatórios");

  const { data: log, error: logError } = await input.admin
    .from("email_send_logs")
    .insert({
      restaurant_id: input.restaurantId || null,
      template_id: template?.id || null,
      template_key: input.templateKey || null,
      email_type: input.emailType || template?.category || "transactional",
      context_type: input.contextType || null,
      context_id: input.contextId || null,
      provider: "resend",
      recipient_email: input.to,
      recipient_name: input.recipientName || null,
      from_email: config.from_email,
      from_name: config.from_name,
      subject,
      status: "queued",
      metadata: input.metadata || {},
    })
    .select("id")
    .single();

  if (logError) throw logError;

  try {
    const resend = new Resend(config.api_key);
    const response = await resend.emails.send({
      from: `${config.from_name} <${config.from_email}>`,
      to: [input.to],
      subject,
      html,
      text,
      reply_to: config.reply_to || undefined,
      tags: [
        { name: "pubfy_log_id", value: String(log.id).replaceAll("-", "_") },
        { name: "pubfy_type", value: String(input.emailType || template?.category || "transactional") },
      ],
    });

    const providerMessageId = (response as any)?.data?.id || (response as any)?.id || null;

    await input.admin
      .from("email_send_logs")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        diagnostic_status: "ok",
        diagnostic_message: "E-mail aceito pelo Resend",
      })
      .eq("id", log.id);

    return { logId: log.id, providerMessageId, response };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await input.admin
      .from("email_send_logs")
      .update({
        status: "failed",
        error_message: message,
        diagnostic_status: "error",
        diagnostic_message: message,
      })
      .eq("id", log.id);
    throw error;
  }
}

export async function upsertRestaurantEmailContact(input: {
  admin: SupabaseAdmin;
  restaurantId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  source: string;
  acceptsMarketing?: boolean;
  lastOrderId?: string | null;
}) {
  const { error } = await input.admin
    .from("restaurant_email_contacts")
    .upsert(
      {
        restaurant_id: input.restaurantId,
        email: input.email.toLowerCase().trim(),
        name: input.name || null,
        phone: input.phone || null,
        source: input.source,
        accepts_marketing: !!input.acceptsMarketing,
        last_order_id: input.lastOrderId || null,
        last_order_at: input.lastOrderId ? new Date().toISOString() : null,
      },
      { onConflict: "restaurant_id,email" },
    );
  if (error) console.error("Erro ao salvar contato de email:", error);
}

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
