// Edge Function: cart-abandonment-cron
// Detects abandoned public-menu carts and sends recovery reminders (email/WhatsApp).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const PUBLIC_SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");

type CartSession = {
  id: string;
  restaurant_id: string;
  session_token: string;
  phone_normalized: string;
  customer_name: string | null;
  customer_email: string | null;
  accepts_email_marketing: boolean;
  accepts_whatsapp_reminder: boolean;
  fulfillment_type: string | null;
  cart_snapshot: Record<string, unknown>;
  cart_subtotal: number;
  item_count: number;
  status: string;
};

type CartSettings = {
  restaurant_id: string;
  enabled: boolean;
  abandonment_minutes: number;
  remind_via_email: boolean;
  remind_via_whatsapp: boolean;
  recovery_coupon_code: string | null;
  reminder_cooldown_days: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request): boolean {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const expected = Deno.env.get("CRON_SECRET") || Deno.env.get("ORDER_FEEDBACK_NOTIFY_SECRET") || "";
  if (expected && headerSecret === expected) return true;

  const auth = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return Boolean(serviceKey && auth === `Bearer ${serviceKey}`);
}

function formatBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPhoneBR(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function menuUrl(slug?: string | null, restaurantId?: string) {
  if (PUBLIC_SITE_URL && slug) return `${PUBLIC_SITE_URL}/${slug}`;
  if (PUBLIC_SITE_URL && restaurantId) return `${PUBLIC_SITE_URL}/cardapio/${restaurantId}`;
  return slug ? `/${slug}` : "/";
}

function couponMessage(code?: string | null) {
  if (!code?.trim()) return "Volte e finalize seu pedido quando quiser.";
  return `Use o cupom ${code.trim().toUpperCase()} para concluir com desconto.`;
}

async function sendWhatsAppReminder(
  admin: ReturnType<typeof createClient>,
  restaurantId: string,
  phone: string,
  text: string,
) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error("Evolution API não configurada.");
  }

  const { data: instance } = await admin
    .from("whatsapp_instances")
    .select("instance_name, status")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .eq("status", "CONNECTED")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!instance?.instance_name) {
    throw new Error("Nenhuma instância WhatsApp conectada.");
  }

  const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/message/sendText/${instance.instance_name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: formatPhoneBR(phone),
      text,
    }),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(`Evolution ${res.status}: ${body}`);
}

async function hasRecentReminder(
  admin: ReturnType<typeof createClient>,
  restaurantId: string,
  phone: string,
  cooldownDays: number,
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("cart_abandonment_sessions")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phone)
    .eq("status", "reminded")
    .gte("reminded_at", since);

  return (count || 0) > 0;
}

async function processRestaurant(
  admin: ReturnType<typeof createClient>,
  settings: CartSettings,
) {
  const abandonedBefore = new Date(Date.now() - settings.abandonment_minutes * 60 * 1000).toISOString();

  await admin
    .from("cart_abandonment_sessions")
    .update({ status: "abandoned", abandoned_at: new Date().toISOString() })
    .eq("restaurant_id", settings.restaurant_id)
    .eq("status", "active")
    .lt("last_activity_at", abandonedBefore);

  await admin
    .from("cart_abandonment_sessions")
    .update({ status: "expired" })
    .eq("restaurant_id", settings.restaurant_id)
    .in("status", ["active", "abandoned"])
    .lt("last_activity_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const { data: sessions, error } = await admin
    .from("cart_abandonment_sessions")
    .select("*")
    .eq("restaurant_id", settings.restaurant_id)
    .eq("status", "abandoned")
    .is("reminded_at", null)
    .order("last_activity_at", { ascending: true })
    .limit(25);

  if (error) throw error;
  if (!sessions?.length) return { abandoned: 0, reminded: 0 };

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, slug")
    .eq("id", settings.restaurant_id)
    .maybeSingle();

  let reminded = 0;

  for (const raw of sessions as CartSession[]) {
    if (await hasRecentReminder(admin, settings.restaurant_id, raw.phone_normalized, settings.reminder_cooldown_days)) {
      continue;
    }

    const canEmail = settings.remind_via_email
      && raw.accepts_email_marketing
      && !!raw.customer_email?.trim();
    const canWhatsApp = settings.remind_via_whatsapp && raw.accepts_whatsapp_reminder;

    if (!canEmail && !canWhatsApp) continue;

    const couponText = couponMessage(settings.recovery_coupon_code);
    const menuLink = menuUrl(restaurant?.slug, settings.restaurant_id);
    const customerName = raw.customer_name || "Cliente";
    const subtotalLabel = formatBRL(raw.cart_subtotal);

    let channel: "email" | "whatsapp" | null = null;

    try {
      if (canEmail) {
        await sendManagedEmail({
          admin,
          restaurantId: settings.restaurant_id,
          preferRestaurantConfig: true,
          templateKey: "cart_abandonment_recovery",
          emailType: "transactional",
          to: raw.customer_email!.trim().toLowerCase(),
          recipientName: customerName,
          contextType: "cart_abandonment",
          contextId: raw.id,
          variables: {
            customer_name: customerName,
            restaurant_name: restaurant?.name || "Restaurante",
            item_count: String(raw.item_count),
            cart_subtotal: subtotalLabel,
            coupon_message: couponText,
            menu_url: menuLink,
          },
          metadata: { source: "cart_abandonment_cron", session_id: raw.id },
        });
        channel = "email";
      } else if (canWhatsApp) {
        const text = [
          `Olá ${customerName}!`,
          `Você deixou ${raw.item_count} item(ns) no cardápio de ${restaurant?.name || "nosso restaurante"} (${subtotalLabel}).`,
          couponText,
          `Finalize aqui: ${menuLink}`,
        ].join("\n");
        await sendWhatsAppReminder(admin, settings.restaurant_id, raw.phone_normalized, text);
        channel = "whatsapp";
      }

      if (!channel) continue;

      await admin
        .from("cart_abandonment_sessions")
        .update({
          status: "reminded",
          reminded_at: new Date().toISOString(),
          reminder_channel: channel,
        })
        .eq("id", raw.id);

      reminded += 1;
    } catch (sendError) {
      console.warn("[cart-abandonment-cron] reminder failed", raw.id, sendError);
    }
  }

  return { abandoned: sessions.length, reminded };
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
    const { data: settingsRows, error } = await admin
      .from("cart_abandonment_settings")
      .select("*")
      .eq("enabled", true);

    if (error) throw error;

    const results = [];
    for (const settings of (settingsRows || []) as CartSettings[]) {
      const result = await processRestaurant(admin, settings);
      results.push({ restaurant_id: settings.restaurant_id, ...result });
    }

    return json({ success: true, processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cart-abandonment-cron]", message);
    await captureEdgeException(error, { functionName: "cart-abandonment-cron", req });
    return json({ error: message }, 400);
  }
});
