// Edge Function: order-feedback-notify
// Sends transactional email to the restaurant owner when a low NPS rating is submitted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOW_RATING_MAX = 6;

type Body = {
  feedback_id?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function feedbackReportsUrl(): string {
  const base = (Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");
  return base ? `${base}/relatorios?tab=avaliacoes` : "/relatorios?tab=avaliacoes";
}

function isAuthorized(req: Request): boolean {
  const headerSecret = req.headers.get("x-internal-secret") || "";
  const expected =
    Deno.env.get("ORDER_FEEDBACK_NOTIFY_SECRET")
    || Deno.env.get("CRON_SECRET")
    || "";

  if (expected && headerSecret === expected) return true;

  const auth = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return Boolean(serviceKey && auth === `Bearer ${serviceKey}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const feedbackId = body.feedback_id;
    if (!feedbackId) return json({ error: "feedback_id obrigatório" }, 400);

    const { data: feedback, error: feedbackErr } = await admin
      .from("order_feedback")
      .select(
        "id, restaurant_id, order_id, rating, comment, contact_requested, customer_name, customer_phone, metadata",
      )
      .eq("id", feedbackId)
      .maybeSingle();

    if (feedbackErr) throw feedbackErr;
    if (!feedback) return json({ skipped: true, reason: "feedback_not_found" });
    if (feedback.rating > LOW_RATING_MAX) {
      return json({ skipped: true, reason: "rating_not_low" });
    }

    const metadata = (feedback.metadata && typeof feedback.metadata === "object")
      ? feedback.metadata as Record<string, unknown>
      : {};
    const alreadySentFor = metadata.owner_alert_sent_for_rating;
    if (String(alreadySentFor ?? "") === String(feedback.rating)) {
      return json({ skipped: true, reason: "already_notified" });
    }

    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id, name, owner_id")
      .eq("id", feedback.restaurant_id)
      .maybeSingle();

    if (!restaurant?.owner_id) return json({ skipped: true, reason: "owner_missing" });

    const { data: owner } = await admin
      .from("users")
      .select("email, name")
      .eq("id", restaurant.owner_id)
      .maybeSingle();

    if (!owner?.email) return json({ skipped: true, reason: "owner_email_missing" });

    const { data: order } = await admin
      .from("orders")
      .select("order_number, total")
      .eq("id", feedback.order_id)
      .maybeSingle();

    const commentPreview = feedback.comment
      ? (feedback.comment.length > 200 ? `${feedback.comment.slice(0, 200)}…` : feedback.comment)
      : "Sem comentário.";

    await sendManagedEmail({
      admin,
      restaurantId: feedback.restaurant_id,
      templateKey: "order_feedback_low_rating",
      emailType: "transactional",
      to: owner.email,
      recipientName: owner.name,
      contextType: "order_feedback",
      contextId: feedback.id,
      variables: {
        owner_name: owner.name || "Dono",
        restaurant_name: restaurant.name || "Restaurante",
        customer_name: feedback.customer_name || "Cliente",
        customer_phone: feedback.customer_phone || "",
        rating: String(feedback.rating),
        comment_preview: commentPreview,
        contact_requested: feedback.contact_requested ? "Sim" : "Não",
        order_number: order?.order_number || String(feedback.order_id).slice(0, 8),
        order_total: Number(order?.total || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        reports_url: feedbackReportsUrl(),
      },
      metadata: {
        source: "order_feedback_notify",
        feedback_id: feedback.id,
        rating: feedback.rating,
      },
    });

    await admin
      .from("order_feedback")
      .update({
        metadata: {
          ...metadata,
          owner_alert_sent_for_rating: feedback.rating,
          owner_alert_sent_at: new Date().toISOString(),
        },
      })
      .eq("id", feedback.id);

    return json({ success: true, feedback_id: feedback.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[order-feedback-notify]", message);
    await captureEdgeException(error, { functionName: "order-feedback-notify", req });
    return json({ error: message }, 400);
  }
});
