import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isEmail, sendManagedEmail, upsertRestaurantEmailContact } from "../_shared/email-delivery.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type JsonRecord = Record<string, unknown>;

type EmailType = "transactional" | "operational" | "marketing" | "test";

type EmailDispatchBody = JsonRecord & {
  action?: string;
  restaurant_id?: string;
  template_key?: string;
  campaign_id?: string;
  order_id?: string;
  tracking_id?: string;
  delivery_order_id?: string;
  email?: string;
  to?: string;
  recipient_name?: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  subject?: string;
  html?: string;
  text?: string;
  context_type?: string;
  context_id?: string;
  email_type?: string;
  accepts_marketing?: boolean;
  origin?: string;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null;

const asRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

const asEmailType = (value: unknown): EmailType => {
  if (value === "operational" || value === "marketing" || value === "test") return value;
  return "transactional";
};

const getUser = async (req: Request) => {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
};

const getProfile = async (userId: string) => {
  const { data } = await admin
    .from("users")
    .select("id, restaurant_id, user_type, role")
    .eq("id", userId)
    .maybeSingle();
  return data;
};

const canManageRestaurant = async (userId: string, restaurantId: string) => {
  const profile = await getProfile(userId);
  const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { user_id: userId });
  if (isSuperAdmin) return true;
  if (profile?.restaurant_id !== restaurantId) return false;
  if (profile.user_type === "owner") return true;

  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee?.id) return false;

  const { data: permission } = await admin
    .from("employee_permissions")
    .select("permission")
    .eq("employee_id", employee.id)
    .eq("permission", "settings_integrations_manage")
    .maybeSingle();

  return !!permission;
};

const ALLOWED_RESTAURANT_TEMPLATE_KEYS = new Set(["order_confirmation", "campaign_basic"]);
const MAX_CAMPAIGN_RECIPIENTS_PER_REQUEST = 250;
const CAMPAIGN_PROGRESS_BATCH_SIZE = 25;
const CAMPAIGN_SEND_CONCURRENCY = 5;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderCampaignContent = (template: string, variables: Record<string, unknown>) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    const value = key.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object" && part in acc) return (acc as Record<string, unknown>)[part];
      return "";
    }, variables);
    return escapeHtml(value);
  });

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getRestaurantEntitlement = async (restaurantId: string) => {
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan_id, status, start_date, created_at")
    .eq("restaurant_id", restaurantId)
    .in("status", ["active", "trialing", "past_due"])
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.plan_id) {
    return {
      planName: "Sem plano ativo",
      campaignsEnabled: false,
      monthlyLimit: 0,
      contactLimit: 0,
      customTemplatesEnabled: false,
    };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("name, email_campaigns_enabled, email_campaign_monthly_limit, email_campaign_contact_limit, email_custom_templates_enabled")
    .eq("id", subscription.plan_id)
    .maybeSingle();

  return {
    planName: plan?.name || "Plano atual",
    campaignsEnabled: !!plan?.email_campaigns_enabled,
    monthlyLimit: Number(plan?.email_campaign_monthly_limit || 0),
    contactLimit: Number(plan?.email_campaign_contact_limit || 0),
    customTemplatesEnabled: !!plan?.email_custom_templates_enabled,
  };
};

const getCampaignUsage = async (restaurantId: string) => {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await admin
    .from("email_send_logs")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("email_type", "marketing")
    .gte("created_at", monthStart.toISOString());

  if (error) throw error;
  return count || 0;
};

const copyAllowedTemplate = async (req: Request, body: EmailDispatchBody) => {
  const user = await getUser(req);
  if (!user) throw new Error("Usuário não autenticado");
  if (!body.restaurant_id) throw new Error("Restaurante obrigatório");
  if (!(await canManageRestaurant(user.id, body.restaurant_id))) throw new Error("Sem permissão");

  const templateKey = String(body.template_key || "");
  if (!ALLOWED_RESTAURANT_TEMPLATE_KEYS.has(templateKey)) {
    throw new Error("Este template é interno do Pubfy e não pode ser copiado para restaurantes.");
  }

  const entitlement = await getRestaurantEntitlement(body.restaurant_id);
  if (templateKey === "campaign_basic" && !entitlement.campaignsEnabled) {
    throw new Error("Campanhas por e-mail estão disponíveis apenas em planos avançados.");
  }
  if (!entitlement.customTemplatesEnabled) {
    throw new Error("Templates personalizados não estão habilitados para o plano atual.");
  }

  const { data: baseTemplate, error: templateError } = await admin
    .from("email_templates")
    .select("*")
    .is("restaurant_id", null)
    .eq("template_key", templateKey)
    .eq("is_enabled", true)
    .maybeSingle();

  if (templateError) throw templateError;
  if (!baseTemplate) throw new Error("Template padrão não encontrado.");

  const { data: copied, error } = await admin
    .from("email_templates")
    .upsert(
      {
        restaurant_id: body.restaurant_id,
        template_key: baseTemplate.template_key,
        name: baseTemplate.name,
        description: baseTemplate.description,
        category: baseTemplate.category,
        subject: baseTemplate.subject,
        html_content: baseTemplate.html_content,
        text_content: baseTemplate.text_content,
        variables: baseTemplate.variables,
        is_enabled: true,
        is_system: false,
        updated_by: user.id,
      },
      { onConflict: "restaurant_id,template_key" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return { template: copied };
};

const sendCampaign = async (req: Request, body: EmailDispatchBody) => {
  const user = await getUser(req);
  if (!user) throw new Error("Usuário não autenticado");
  if (!body.restaurant_id || !body.campaign_id) throw new Error("Campanha inválida");
  if (!(await canManageRestaurant(user.id, body.restaurant_id))) throw new Error("Sem permissão");

  const entitlement = await getRestaurantEntitlement(body.restaurant_id);
  if (!entitlement.campaignsEnabled) {
    throw new Error(`O plano ${entitlement.planName} não inclui campanhas por e-mail.`);
  }

  const usedThisMonth = await getCampaignUsage(body.restaurant_id);
  const remaining = Math.max(0, entitlement.monthlyLimit - usedThisMonth);
  if (remaining <= 0) {
    throw new Error("Limite mensal de campanhas por e-mail atingido para este plano.");
  }

  const { data: campaign, error: campaignError } = await admin
    .from("email_campaigns")
    .select("id, restaurant_id, name, subject, html_content, text_content, status, audience_filter")
    .eq("id", body.campaign_id)
    .eq("restaurant_id", body.restaurant_id)
    .maybeSingle();

  if (campaignError) throw campaignError;
  if (!campaign) throw new Error("Campanha não encontrada.");
  if (!["draft", "failed"].includes(campaign.status)) {
    throw new Error("Somente campanhas em rascunho ou falhadas podem ser enviadas.");
  }

  const audience = campaign.audience_filter || {};
  const audienceType = String(audience.type || "marketing_opt_in");
  const days = Number(audience.days || 90);
  const maxRecipients = Math.min(
    remaining,
    entitlement.contactLimit || remaining,
    MAX_CAMPAIGN_RECIPIENTS_PER_REQUEST,
  );

  let contactQuery = admin
    .from("restaurant_email_contacts")
    .select("id, email, name, unsubscribe_token, last_order_at")
    .eq("restaurant_id", body.restaurant_id)
    .eq("accepts_marketing", true)
    .is("unsubscribed_at", null)
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .limit(maxRecipients);

  if (audienceType === "recent_customers") {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    contactQuery = contactQuery.gte("last_order_at", since);
  } else if (audienceType === "inactive_customers") {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    contactQuery = contactQuery.lte("last_order_at", since);
  }

  const { data: contacts, error: contactsError } = await contactQuery;
  if (contactsError) throw contactsError;
  if (!contacts?.length) throw new Error("Nenhum contato com opt-in encontrado para este público.");

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", body.restaurant_id)
    .maybeSingle();

  await admin
    .from("email_campaigns")
    .update({
      status: "sending",
      recipient_count: contacts.length,
      sent_count: 0,
      failed_count: 0,
      last_error: null,
    })
    .eq("id", campaign.id);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const functionBaseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-unsubscribe`;

  const persistCampaignProgress = async () => {
    await admin
      .from("email_campaigns")
      .update({
        status: "sending",
        sent_count: sent,
        failed_count: failed,
        last_error: errors[0] || null,
      })
      .eq("id", campaign.id);
  };

  let processed = 0;
  const progressChunks = chunkArray(contacts, CAMPAIGN_PROGRESS_BATCH_SIZE);

  for (const progressChunk of progressChunks) {
    const sendChunks = chunkArray(progressChunk, CAMPAIGN_SEND_CONCURRENCY);

    for (const sendChunk of sendChunks) {
      await Promise.all(sendChunk.map(async (contact) => {
        const unsubscribeUrl = `${functionBaseUrl}?token=${encodeURIComponent(contact.unsubscribe_token || "")}`;
        const variables = {
          restaurant_name: restaurant?.name || "Restaurante",
          contact_name: contact.name || "Cliente",
          email: contact.email,
          unsubscribe_url: unsubscribeUrl,
        };
        const html = `${renderCampaignContent(campaign.html_content, variables)}
          <hr>
          <p style="font-size:12px;color:#64748b;line-height:1.5">
            Você recebeu este e-mail porque autorizou comunicações deste restaurante.
            <a href="${unsubscribeUrl}">Descadastrar</a>
          </p>`;
        const text = campaign.text_content
          ? `${renderCampaignContent(campaign.text_content, variables)}\n\nDescadastrar: ${unsubscribeUrl}`
          : undefined;

        try {
          await sendManagedEmail({
            admin,
            restaurantId: body.restaurant_id,
            preferRestaurantConfig: true,
            emailType: "marketing",
            to: contact.email,
            recipientName: contact.name,
            subject: campaign.subject,
            html,
            text,
            contextType: "campaign",
            contextId: campaign.id,
            metadata: { source: "email_campaign", campaign_id: campaign.id, contact_id: contact.id },
          });
          sent += 1;
        } catch (error) {
          failed += 1;
          errors.push(error instanceof Error ? error.message : String(error));
        } finally {
          processed += 1;
        }
      }));
    }

    if (processed > 0) {
      await persistCampaignProgress();
    }
  }

  await admin
    .from("email_campaigns")
    .update({
      status: sent > 0 ? "sent" : "failed",
      sent_at: sent > 0 ? new Date().toISOString() : null,
      sent_count: sent,
      failed_count: failed,
      last_error: errors.slice(0, 3).join(" | ") || null,
    })
    .eq("id", campaign.id);

  return {
    sent,
    failed,
    recipient_count: contacts.length,
    monthly_limit: entitlement.monthlyLimit,
    used_this_month: usedThisMonth + sent + failed,
    remaining_after: Math.max(0, remaining - sent - failed),
    capped_at: MAX_CAMPAIGN_RECIPIENTS_PER_REQUEST,
  };
};

const sendOrderConfirmation = async (body: EmailDispatchBody) => {
  const email = String(body.email || "").trim().toLowerCase();
  if (!isEmail(email)) throw new Error("E-mail do cliente inválido");
  if (!body.order_id || !body.restaurant_id) throw new Error("Pedido inválido");
  if (!body.tracking_id) throw new Error("Código de acompanhamento obrigatório");

  const { data: order, error } = await admin
    .from("orders")
    .select("id, restaurant_id, order_number, customer_name, customer_phone, customer_email, total, status, created_at")
    .eq("id", body.order_id)
    .eq("restaurant_id", body.restaurant_id)
    .maybeSingle();

  if (error || !order) throw new Error("Pedido não encontrado");

  let trackingMatchesOrder = body.tracking_id === order.id;
  if (!trackingMatchesOrder) {
    const { data: deliveryTracking, error: trackingError } = await admin
      .from("delivery_orders")
      .select("id")
      .eq("id", body.tracking_id)
      .eq("order_id", order.id)
      .maybeSingle();

    if (trackingError) throw trackingError;
    trackingMatchesOrder = !!deliveryTracking;
  }

  if (!trackingMatchesOrder) {
    throw new Error("Código de acompanhamento inválido");
  }

  const createdAt = new Date(order.created_at).getTime();
  if (Number.isFinite(createdAt) && Date.now() - createdAt > 60 * 60 * 1000) {
    throw new Error("Janela de envio da confirmação expirada");
  }

  if (order.customer_email && String(order.customer_email).toLowerCase() !== email) {
    throw new Error("E-mail diferente do informado no pedido");
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name")
    .eq("id", order.restaurant_id)
    .maybeSingle();

  const trackingId = body.tracking_id || body.delivery_order_id || order.id;
  const origin = String(body.origin || Deno.env.get("PUBLIC_SITE_URL") || "")
    .trim()
    .replace(/\/+$/, "");
  if (!origin) {
    console.warn("[email-dispatch] origin/PUBLIC_SITE_URL ausente; e-mail de pedido sairá sem link de acompanhamento");
  }
  const trackingUrl = origin ? `${origin}/pedido/${trackingId}` : "";

  await admin
    .from("delivery_orders")
    .update({ customer_email: email })
    .eq("order_id", order.id);

  await upsertRestaurantEmailContact({
    admin,
    restaurantId: order.restaurant_id,
    email,
    name: order.customer_name,
    phone: order.customer_phone,
    source: "public_order",
    acceptsMarketing: !!body.accepts_marketing,
    lastOrderId: order.id,
  });

  return await sendManagedEmail({
    admin,
    restaurantId: order.restaurant_id,
    preferRestaurantConfig: true,
    templateKey: "order_confirmation",
    emailType: "transactional",
    to: email,
    recipientName: order.customer_name,
    contextType: "order",
    contextId: order.id,
    variables: {
      customer_name: order.customer_name || "Cliente",
      order_number: order.order_number || String(order.id).slice(0, 8),
      restaurant_name: restaurant?.name || "Restaurante",
      total: Number(order.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      tracking_url: trackingUrl,
    },
    metadata: { source: "public_order", tracking_id: trackingId },
  });
};

const sendTemplate = async (req: Request, body: EmailDispatchBody) => {
  const user = await getUser(req);
  if (!user) throw new Error("Usuário não autenticado");
  if (!body.restaurant_id) throw new Error("Restaurante obrigatório");
  if (!(await canManageRestaurant(user.id, body.restaurant_id))) throw new Error("Sem permissão");
  if (!isEmail(String(body.to || ""))) throw new Error("Destinatário inválido");
  const to = String(body.to || "").trim().toLowerCase();

  return await sendManagedEmail({
    admin,
    restaurantId: body.restaurant_id,
    preferRestaurantConfig: true,
    templateKey: body.template_key,
    emailType: asEmailType(body.email_type),
    to,
    recipientName: body.recipient_name,
    variables: body.variables || {},
    subject: body.subject,
    html: body.html,
    text: body.text,
    contextType: body.context_type,
    contextId: body.context_id,
    metadata: { source: "manual_dispatch", ...asRecord(body.metadata) },
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as EmailDispatchBody;
    const action = body.action || "send_template";

    if (action === "send_order_confirmation") {
      return json({ success: true, ...(await sendOrderConfirmation(body)) });
    }

    if (action === "send_template") {
      return json({ success: true, ...(await sendTemplate(req, body)) });
    }

    if (action === "copy_allowed_template") {
      return json({ success: true, ...(await copyAllowedTemplate(req, body)) });
    }

    if (action === "send_campaign") {
      return json({ success: true, ...(await sendCampaign(req, body)) });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("email-dispatch error:", message);
    await captureEdgeException(error, {
      functionName: "email-dispatch",
      req,
    });
    return json({ success: false, error: message }, 400);
  }
});
