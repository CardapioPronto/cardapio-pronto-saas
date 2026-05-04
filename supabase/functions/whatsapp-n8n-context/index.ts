import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const N8N_INTERNAL_API_KEY = Deno.env.get("N8N_INTERNAL_API_KEY");

type SupabaseClient = ReturnType<typeof createClient>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ensureN8nRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const n8nSecret = req.headers.get("x-n8n-secret");
  const expectedSecret = N8N_INTERNAL_API_KEY;

  if (!expectedSecret || (token !== expectedSecret && n8nSecret !== expectedSecret)) {
    throw new Error("Unauthorized n8n request");
  }
}

function fallbackFrom(settings: any) {
  try {
    const extra = JSON.parse(settings?.additional_instructions || "{}");
    return extra.fallback_message || "Vou transferir voce para um atendente humano.";
  } catch {
    return "Vou transferir voce para um atendente humano.";
  }
}

function isInsideBusinessHours(settings: any) {
  if (!settings?.business_hours_only || !settings.business_hours) return true;

  const hours =
    typeof settings.business_hours === "string"
      ? JSON.parse(settings.business_hours)
      : settings.business_hours;

  const now = new Date();
  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];
  const day = hours?.[dayKey];
  if (!day?.enabled) return false;

  const hhmm = now.toISOString().slice(11, 16);
  return hhmm >= day.start && hhmm <= day.end;
}

function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function normalizePhone(raw: unknown) {
  if (!raw) return null;
  const digits = String(raw).split("@")[0].replace(/\D/g, "");
  return digits || null;
}

function isAudioMessage(item: any) {
  const messageType = String(item.messageType || "").toLowerCase();
  return messageType.includes("audio");
}

function buildIncomingContent(item: any) {
  const transcript = String(item.transcription || item.userMessage || "").trim();
  if (isAudioMessage(item)) {
    return transcript || "[Audio sem transcricao]";
  }

  return String(item.userMessage || "").trim() || "[Mensagem sem texto]";
}

function buildIncomingPreview(item: any) {
  const content = buildIncomingContent(item);
  const prefix = isAudioMessage(item) ? "Audio: " : "";
  return `${prefix}${content}`.slice(0, 120);
}

async function loadContext(supabase: SupabaseClient, item: any) {
  const required = ["instanceName", "remoteJid", "customerPhone"];
  for (const key of required) {
    if (!item[key]) throw new Error(`Campo obrigatorio ausente no workflow: ${key}`);
  }

  const { data: instance, error: instanceError } = await supabase
    .from("whatsapp_instances")
    .select("id,restaurant_id,instance_name,status,automation_enabled,is_active,phone_number,webhook_url")
    .eq("instance_name", item.instanceName)
    .eq("is_active", true)
    .maybeSingle();

  if (instanceError) throw instanceError;
  if (!instance?.id) {
    throw new Error(`Instancia WhatsApp nao encontrada ou inativa: ${item.instanceName}`);
  }

  const restaurantId = instance.restaurant_id;
  const connectedPhone = normalizePhone(item.body?.sender || item.sender);
  const receivedWebhookUrl = item.body?.destination || item.webhookUrl || null;

  if (
    (connectedPhone && instance.phone_number !== connectedPhone) ||
    (receivedWebhookUrl && !instance.webhook_url)
  ) {
    const { error: instanceUpdateError } = await supabase
      .from("whatsapp_instances")
      .update({
        phone_number: connectedPhone || instance.phone_number,
        webhook_url: receivedWebhookUrl || instance.webhook_url,
        status: "CONNECTED",
        last_connection_update_at: new Date().toISOString(),
      })
      .eq("id", instance.id);

    if (instanceUpdateError) throw instanceUpdateError;
    instance.phone_number = connectedPhone || instance.phone_number;
    instance.webhook_url = receivedWebhookUrl || instance.webhook_url;
    instance.status = "CONNECTED";
  }

  const [
    settingsResult,
    restaurantResult,
    rulesResult,
    productsResult,
    recentOrdersResult,
    threadResult,
  ] = await Promise.all([
    supabase
      .from("automation_settings")
      .select("*")
      .eq("instance_id", instance.id)
      .maybeSingle(),
    supabase
      .from("restaurants")
      .select("id,name,slug,phone,phone_whatsapp,business_hours,category")
      .eq("id", restaurantId)
      .maybeSingle(),
    supabase
      .from("ai_handoff_rules")
      .select("rule_type,rule_value,priority")
      .eq("instance_id", instance.id)
      .eq("is_active", true)
      .order("priority", { ascending: true }),
    supabase
      .from("products")
      .select("id,name,description,price,category_id")
      .eq("restaurant_id", restaurantId)
      .eq("available", true)
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("delivery_orders")
      .select("id,status,total,created_at,estimated_delivery_minutes")
      .eq("restaurant_id", restaurantId)
      .ilike("customer_phone", `%${String(item.customerPhone).slice(-8)}%`)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("conversation_threads")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("instance_id", instance.id)
      .eq("remote_jid", item.remoteJid)
      .maybeSingle(),
  ]);

  for (const result of [
    settingsResult,
    restaurantResult,
    rulesResult,
    productsResult,
    recentOrdersResult,
    threadResult,
  ]) {
    if (result.error) throw result.error;
  }

  const settings = settingsResult.data || {
    ai_enabled: true,
    bot_name: "Atendente Virtual",
    ai_persona: "Atendente simpatico e profissional",
    use_menu_knowledge: true,
    auto_handoff_enabled: true,
    auto_handoff_confidence_threshold: 0.3,
    welcome_message: "Ola! Como posso ajudar?",
  };
  const restaurant = restaurantResult.data || { id: restaurantId, name: "Loja" };
  const rules = rulesResult.data || [];
  const products = productsResult.data || [];
  const recentOrders = recentOrdersResult.data || [];

  let thread = threadResult.data;
  const incomingContent = buildIncomingContent(item);
  const preview = buildIncomingPreview(item);

  if (!thread?.id) {
    const { data: created, error } = await supabase
      .from("conversation_threads")
      .insert({
        restaurant_id: restaurantId,
        instance_id: instance.id,
        remote_jid: item.remoteJid,
        customer_phone: item.customerPhone,
        customer_name: item.customerName,
        status: "bot_active",
        unread_count: 1,
        last_message_at: item.receivedAt,
        last_message_preview: preview,
        metadata: { instanceName: item.instanceName },
      })
      .select()
      .single();

    if (error) throw error;
    thread = created;
  } else {
    const { error } = await supabase
      .from("conversation_threads")
      .update({
        unread_count: Number(thread.unread_count || 0) + 1,
        last_message_at: item.receivedAt,
        last_message_preview: preview,
        customer_name: item.customerName || thread.customer_name,
      })
      .eq("id", thread.id);

    if (error) throw error;
  }

  const { error: messageError } = await supabase.from("conversation_messages").insert({
    thread_id: thread.id,
    restaurant_id: restaurantId,
    sender_type: "customer",
    content: incomingContent,
    message_type: isAudioMessage(item) ? "audio" : item.messageType || "text",
    metadata: {
      messageId: item.messageId,
      remoteJid: item.remoteJid,
      transcription: item.transcription || null,
      originalMessageType: item.messageType || null,
      mediaType: isAudioMessage(item) ? "audio" : null,
    },
  });

  if (messageError) throw messageError;

  const lower = String(item.userMessage || "").toLowerCase();
  const keywordRules = rules.filter(
    (rule: any) =>
      ["keyword", "customer_request"].includes(rule.rule_type) && rule.rule_value,
  );
  const matchedRule = keywordRules.find((rule: any) =>
    lower.includes(String(rule.rule_value).toLowerCase()),
  );
  const outsideHours = !isInsideBusinessHours(settings);
  const automationEnabled = instance.automation_enabled !== false && settings.ai_enabled !== false;
  const needsHuman = Boolean(settings.auto_handoff_enabled && matchedRule) || outsideHours;
  const fallbackMessage = outsideHours
    ? "No momento estamos fora do horario de atendimento. Sua mensagem ficou registrada e retornaremos assim que possivel."
    : fallbackFrom(settings);

  if (needsHuman) {
    const { error } = await supabase
      .from("conversation_threads")
      .update({ status: "waiting_human" })
      .eq("id", thread.id);

    if (error) throw error;
  }

  const shouldUseAI =
    automationEnabled &&
    !needsHuman &&
    thread.status !== "human_active" &&
    thread.status !== "waiting_human" &&
    thread.status !== "closed" &&
    Boolean(item.userMessage);

  const menuSummary =
    settings.use_menu_knowledge === false
      ? "Cardapio nao habilitado para IA."
      : products
          .map(
            (product: any) =>
              `- ${product.name}: R$ ${formatMoney(product.price)}${
                product.description ? ` | ${product.description}` : ""
              }`,
          )
          .join("\n");

  const ordersSummary =
    recentOrders
      .map(
        (order: any) =>
          `- Pedido ${String(order.id).slice(0, 8)}: ${order.status}, total R$ ${formatMoney(
            order.total,
          )}, criado em ${order.created_at}`,
      )
      .join("\n") || "Nenhum pedido recente encontrado para este telefone.";

  const handoffSummary =
    keywordRules.map((rule: any) => rule.rule_value).filter(Boolean).join(", ") ||
    "sem palavras-chave configuradas";

  const systemPrompt = `Voce e ${
    settings.bot_name || "Atendente Virtual"
  }, atendente virtual de ${restaurant.name}.
Responda em portugues brasileiro, de forma objetiva e cordial.
Persona/tom: ${settings.ai_persona || "profissional e simpatico"}.

Regras obrigatorias:
- Atenda somente esta loja e esta instancia: ${item.instanceName}.
- Use apenas o cardapio e contexto recebidos. Nao invente produto, preco, prazo, status ou politica.
- Se o cliente quiser montar pedido, colete itens, quantidades, observacoes, entrega/retirada, endereco e pagamento.
- Para pedidos ja feitos pelo menu delivery, use o contexto de pedidos recentes.
- Se o cliente pedir humano, reclamar, cancelar, falar de problema de pagamento, ou a confianca for baixa, devolva action=handoff.
- Palavras de handoff: ${handoffSummary}.

Cardapio disponivel:
${menuSummary || "Sem produtos disponiveis."}

Pedidos recentes deste cliente:
${ordersSummary}

Responda sempre em JSON valido neste formato:
{"action":"reply|handoff|order_status|create_order_draft","message":"texto para enviar ao cliente","confidence":0.0,"handoff_reason":null,"order_draft":null}`;

  return {
    ...item,
    instance,
    restaurant,
    automation: settings,
    handoffRules: rules,
    products,
    recentOrders,
    thread,
    threadId: thread.id,
    shouldUseAI,
    action: needsHuman ? "handoff" : "reply",
    outboundText: needsHuman ? fallbackMessage : "",
    handoffReason: matchedRule?.rule_value || (outsideHours ? "outside_business_hours" : null),
    systemPrompt,
    aiInput: item.userMessage,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    ensureN8nRequest(req);
    const item = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const result = await loadContext(supabase, item);
    return jsonResponse(result);
  } catch (error: any) {
    console.error("whatsapp-n8n-context error", error);
    const status = error.message === "Unauthorized n8n request" ? 401 : 500;
    return jsonResponse({ error: error.message || "Erro interno" }, status);
  }
});
