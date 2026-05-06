import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isEmail, sendManagedEmail, upsertRestaurantEmailContact } from "../_shared/email-delivery.ts";

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

const sendOrderConfirmation = async (body: any) => {
  const email = String(body.email || "").trim().toLowerCase();
  if (!isEmail(email)) throw new Error("E-mail do cliente inválido");
  if (!body.order_id || !body.restaurant_id) throw new Error("Pedido inválido");

  const { data: order, error } = await admin
    .from("orders")
    .select("id, restaurant_id, order_number, customer_name, customer_phone, total, status")
    .eq("id", body.order_id)
    .eq("restaurant_id", body.restaurant_id)
    .maybeSingle();

  if (error || !order) throw new Error("Pedido não encontrado");

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name")
    .eq("id", order.restaurant_id)
    .maybeSingle();

  const trackingId = body.tracking_id || body.delivery_order_id || order.id;
  const origin = String(body.origin || Deno.env.get("PUBLIC_SITE_URL") || "https://preview--cardapio-pubfy.lovable.app");

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
      tracking_url: `${origin}/pedido/${trackingId}`,
    },
    metadata: { source: "public_order", tracking_id: trackingId },
  });
};

const sendTemplate = async (req: Request, body: any) => {
  const user = await getUser(req);
  if (!user) throw new Error("Usuário não autenticado");
  if (!body.restaurant_id) throw new Error("Restaurante obrigatório");
  if (!(await canManageRestaurant(user.id, body.restaurant_id))) throw new Error("Sem permissão");
  if (!isEmail(String(body.to || ""))) throw new Error("Destinatário inválido");

  return await sendManagedEmail({
    admin,
    restaurantId: body.restaurant_id,
    preferRestaurantConfig: true,
    templateKey: body.template_key,
    emailType: body.email_type || "transactional",
    to: body.to,
    recipientName: body.recipient_name,
    variables: body.variables || {},
    subject: body.subject,
    html: body.html,
    text: body.text,
    contextType: body.context_type,
    contextId: body.context_id,
    metadata: { source: "manual_dispatch", ...(body.metadata || {}) },
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const action = body.action || "send_template";

    if (action === "send_order_confirmation") {
      return json({ success: true, ...(await sendOrderConfirmation(body)) });
    }

    if (action === "send_template") {
      return json({ success: true, ...(await sendTemplate(req, body)) });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("email-dispatch error:", message);
    return json({ success: false, error: message }, 400);
  }
});
