import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const mapEventToStatus = (eventType: string) => {
  const normalized = eventType.replace("email.", "");
  switch (normalized) {
    case "sent":
      return { status: "sent", column: "sent_at" };
    case "delivered":
      return { status: "delivered", column: "delivered_at" };
    case "delivery_delayed":
      return { status: "delivery_delayed", column: "last_event_at" };
    case "opened":
      return { status: "opened", column: "opened_at" };
    case "clicked":
      return { status: "clicked", column: "clicked_at" };
    case "bounced":
      return { status: "bounced", column: "bounced_at" };
    case "complained":
      return { status: "complained", column: "complained_at" };
    default:
      return { status: null, column: "last_event_at" };
  }
};

const extractMessageId = (payload: any) =>
  payload?.data?.email_id ||
  payload?.data?.email?.id ||
  payload?.data?.id ||
  payload?.email_id ||
  null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const svixId = req.headers.get("svix-id");
  const rawBody = await req.text();
  let payload: any;

  try {
    const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (secret) {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "re_placeholder");
      payload = await resend.webhooks.verify({
        payload: rawBody,
        headers: {
          id: svixId || "",
          timestamp: req.headers.get("svix-timestamp") || "",
          signature: req.headers.get("svix-signature") || "",
        },
        webhookSecret: secret,
      });
    } else {
      payload = JSON.parse(rawBody);
    }
  } catch (error) {
    console.error("Invalid Resend webhook:", error);
    return json({ error: "Invalid webhook" }, 400);
  }

  const eventType = payload?.type || payload?.event || "unknown";
  const providerMessageId = extractMessageId(payload);

  try {
    if (svixId) {
      const { data: existing } = await admin
        .from("email_webhook_events")
        .select("id")
        .eq("svix_id", svixId)
        .maybeSingle();
      if (existing) return json({ success: true, duplicate: true });
    }

    let emailLogId: string | null = null;
    if (providerMessageId) {
      const { data: log } = await admin
        .from("email_send_logs")
        .select("id")
        .eq("provider_message_id", providerMessageId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      emailLogId = log?.id || null;
    }

    const { data: eventRow, error: eventError } = await admin
      .from("email_webhook_events")
      .insert({
        svix_id: svixId,
        event_type: eventType,
        provider_message_id: providerMessageId,
        email_log_id: emailLogId,
        payload,
        processed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (eventError) throw eventError;

    if (emailLogId) {
      const now = new Date().toISOString();
      const mapped = mapEventToStatus(eventType);
      const update: Record<string, unknown> = {
        last_event_at: payload?.created_at || now,
      };
      if (mapped.status) update.status = mapped.status;
      if (mapped.column) update[mapped.column] = payload?.created_at || now;

      await admin.from("email_send_logs").update(update).eq("id", emailLogId);
    }

    return json({ success: true, event_id: eventRow.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("resend-webhook processing error:", message);
    if (svixId) {
      await admin
        .from("email_webhook_events")
        .insert({
          svix_id: svixId,
          event_type: eventType,
          provider_message_id: providerMessageId,
          payload,
          error_message: message,
        })
        .select("id")
        .maybeSingle();
    }
    return json({ success: false, error: message }, 500);
  }
});
