import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const N8N_INTERNAL_API_KEY = Deno.env.get("N8N_INTERNAL_API_KEY");

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    ensureN8nRequest(req);
    const { item, sendResult } = await req.json();

    if (!item?.threadId) throw new Error("threadId ausente no payload");
    if (!item?.restaurant?.id) throw new Error("restaurant.id ausente no payload");
    if (!item?.outboundText) throw new Error("outboundText ausente no payload");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (item.action === "handoff") {
      const { error } = await supabase
        .from("conversation_threads")
        .update({ status: "waiting_human" })
        .eq("id", item.threadId);

      if (error) throw error;
    }

    const { error: messageError } = await supabase.from("conversation_messages").insert({
      thread_id: item.threadId,
      restaurant_id: item.restaurant.id,
      sender_type: "bot",
      content: item.outboundText,
      message_type: "text",
      metadata: {
        action: item.action,
        confidence: item.confidence || null,
        handoffReason: item.handoffReason || null,
        evolution_result: sendResult || null,
      },
    });

    if (messageError) throw messageError;

    const { error: threadError } = await supabase
      .from("conversation_threads")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: String(item.outboundText).slice(0, 120),
        unread_count: 0,
      })
      .eq("id", item.threadId);

    if (threadError) throw threadError;

    return jsonResponse({
      success: true,
      threadId: item.threadId,
      action: item.action,
      sentText: item.outboundText,
      evolution: sendResult || null,
    });
  } catch (error) {
    console.error("whatsapp-n8n-persist-outgoing error", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    const status = message === "Unauthorized n8n request" ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
