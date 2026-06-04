import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { captureEdgeException } from "../_shared/observability.ts";
import { pollIfoodEvents, type IfoodPollConfig } from "../_shared/ifood-poll-core.ts";
import {
  getIfoodAccessToken,
  hasIfoodSaasAppCredentials,
  loadIfoodCredentialsForRestaurant,
  loadIfoodSaasAppCredentials,
  pushPubfyStatusToIfood,
} from "../_shared/ifood-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

type Action =
  | "get_config"
  | "save_config"
  | "toggle"
  | "update_polling"
  | "update_notifications"
  | "list_item_mappings"
  | "save_item_mapping"
  | "test"
  | "poll"
  | "update_order_status";

type IfoodConfig = {
  restaurant_id: string;
  client_id?: string | null;
  client_secret?: string | null;
  merchant_id: string;
  restaurant_ifood_id: string | null;
  is_enabled: boolean;
  polling_enabled: boolean;
  polling_interval: number;
  webhook_url: string | null;
  notify_new_orders: boolean;
  notify_status_changes: boolean;
};

type Profile = {
  id: string;
  restaurant_id: string | null;
  user_type: string | null;
  role: string | null;
};

type IfoodEvent = {
  id: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  merchantId?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("Usuário não autenticado");

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user;
};

const loadProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await admin
    .from("users")
    .select("id, restaurant_id, user_type, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) throw new Error("Perfil do usuário não encontrado");
  return data as Profile;
};

const isSuperAdmin = async (userId: string) => {
  const { data } = await admin.rpc("is_super_admin", { user_id: userId });
  return !!data;
};

const hasIntegrationPermission = async (userId: string) => {
  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee?.id) return false;

  const { data } = await admin
    .from("employee_permissions")
    .select("permission")
    .eq("employee_id", employee.id)
    .eq("permission", "settings_integrations_manage")
    .maybeSingle();

  return !!data;
};

const resolveRestaurantId = async (userId: string, requestedRestaurantId?: string) => {
  const profile = await loadProfile(userId);
  const superAdmin = profile.role === "super_admin" || await isSuperAdmin(userId);
  const restaurantId = requestedRestaurantId || profile.restaurant_id;

  if (!restaurantId) throw new Error("Restaurante não encontrado para este usuário");

  if (superAdmin) return restaurantId;
  if (restaurantId !== profile.restaurant_id) throw new Error("Sem permissão para este restaurante");
  if (profile.user_type === "owner" || await hasIntegrationPermission(userId)) return restaurantId;

  throw new Error("Sem permissão para gerenciar integrações");
};

const publicConfigFor = (config: Partial<IfoodConfig> | null, hasSaasAppCredentials: boolean) => ({
  merchantId: config?.merchant_id || "",
  restaurantIfoodId: config?.restaurant_ifood_id || "",
  isEnabled: Boolean(config?.is_enabled),
  pollingEnabled: config?.polling_enabled ?? true,
  pollingInterval: config?.polling_interval ?? 60,
  webhookUrl: config?.webhook_url || null,
  hasSaasAppCredentials,
  notifyNewOrders: config?.notify_new_orders ?? true,
  notifyStatusChanges: config?.notify_status_changes ?? true,
});

const loadIfoodConfigRow = async (restaurantId: string) => {
  const { data, error } = await admin
    .from("ifood_integration")
    .select("restaurant_id, client_id, client_secret, merchant_id, restaurant_ifood_id, is_enabled, polling_enabled, polling_interval, webhook_url, notify_new_orders, notify_status_changes")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw error;
  return data as IfoodConfig | null;
};

const loadIfoodConfig = async (restaurantId: string): Promise<IfoodConfig> => {
  const data = await loadIfoodConfigRow(restaurantId);
  if (!data) throw new Error("Configuração do iFood não encontrada");
  if (!data.merchant_id) {
    throw new Error("Loja iFood não configurada");
  }
  const appCredentials = await loadIfoodSaasAppCredentials(admin);
  return { ...data, ...appCredentials };
};

const getPublicConfig = async (restaurantId: string) => {
  const config = await loadIfoodConfigRow(restaurantId);
  const appConfigured = await hasIfoodSaasAppCredentials(admin);
  return {
    success: true,
    config: publicConfigFor(config, appConfigured),
  };
};

const saveConfig = async (restaurantId: string, payload: Record<string, unknown>) => {
  const existing = await loadIfoodConfigRow(restaurantId);
  const merchantId = String(payload.merchantId || "").trim();
  const restaurantIfoodId = String(payload.restaurantIfoodId || payload.ifoodRestaurantId || "").trim();
  const pollingInterval = Math.min(300, Math.max(30, Number(payload.pollingInterval || existing?.polling_interval || 60)));

  if (!merchantId) {
    throw new Error("Merchant ID é obrigatório.");
  }

  const baseConfig = {
    merchant_id: merchantId,
    restaurant_ifood_id: restaurantIfoodId || null,
    is_enabled: typeof payload.isEnabled === "boolean" ? payload.isEnabled : Boolean(existing?.is_enabled),
    polling_enabled: typeof payload.pollingEnabled === "boolean" ? payload.pollingEnabled : (existing?.polling_enabled ?? true),
    polling_interval: pollingInterval,
    notify_new_orders: typeof payload.notifyNewOrders === "boolean"
      ? payload.notifyNewOrders
      : (existing?.notify_new_orders ?? true),
    notify_status_changes: typeof payload.notifyStatusChanges === "boolean"
      ? payload.notifyStatusChanges
      : (existing?.notify_status_changes ?? true),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await admin
      .from("ifood_integration")
      .update(baseConfig)
      .eq("restaurant_id", restaurantId);

    if (error) throw error;
  } else {
    const { error } = await admin
      .from("ifood_integration")
      .insert({
        restaurant_id: restaurantId,
        ...baseConfig,
      });

    if (error) throw error;
  }

  const saved = await loadIfoodConfigRow(restaurantId);
  const appConfigured = await hasIfoodSaasAppCredentials(admin);
  return {
    success: true,
    config: publicConfigFor(saved, appConfigured),
  };
};

const toggleConfig = async (restaurantId: string, enabled: unknown) => {
  if (typeof enabled !== "boolean") throw new Error("Status da integração inválido.");

  const { error } = await admin
    .from("ifood_integration")
    .update({
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  if (error) throw error;

  const saved = await loadIfoodConfigRow(restaurantId);
  const appConfigured = await hasIfoodSaasAppCredentials(admin);
  return {
    success: true,
    config: publicConfigFor(saved, appConfigured),
  };
};

const updatePollingConfig = async (restaurantId: string, payload: Record<string, unknown>) => {
  const pollingEnabled = payload.pollingEnabled;
  const pollingInterval = payload.pollingInterval === undefined
    ? undefined
    : Math.min(300, Math.max(30, Number(payload.pollingInterval)));

  if (typeof pollingEnabled !== "boolean") throw new Error("Status da sincronização inválido.");
  if (payload.pollingInterval !== undefined && !Number.isFinite(pollingInterval)) {
    throw new Error("Intervalo de sincronização inválido.");
  }

  const { error } = await admin
    .from("ifood_integration")
    .update({
      polling_enabled: pollingEnabled,
      ...(pollingInterval === undefined ? {} : { polling_interval: pollingInterval }),
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  if (error) throw error;

  const saved = await loadIfoodConfigRow(restaurantId);
  const appConfigured = await hasIfoodSaasAppCredentials(admin);
  return {
    success: true,
    config: publicConfigFor(saved, appConfigured),
  };
};


const updateOrderStatusOnIfood = async (
  restaurantId: string,
  orderId: string,
  pubfyStatus: string,
) => {
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, ifood_id, source, order_type, status")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order?.id) throw new Error("Pedido não encontrado.");
  if (!order.ifood_id || order.source !== "ifood") {
    return { success: true, skipped: true, reason: "not_ifood_order" };
  }

  const credentials = await loadIfoodCredentialsForRestaurant(admin, restaurantId);
  const orderTypeHint = order.order_type === "balcao" ? "TAKEOUT" : "DELIVERY";
  const result = await pushPubfyStatusToIfood(
    credentials,
    order.ifood_id,
    pubfyStatus,
    orderTypeHint,
  );

  return { success: true, ifood_order_id: order.ifood_id, pubfy_status: pubfyStatus, ...result };
};



const updateNotificationConfig = async (restaurantId: string, payload: Record<string, unknown>) => {
  const notifyNewOrders = payload.notifyNewOrders;
  const notifyStatusChanges = payload.notifyStatusChanges;
  if (typeof notifyNewOrders !== "boolean" && typeof notifyStatusChanges !== "boolean") {
    throw new Error("Informe ao menos uma preferência de notificação.");
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof notifyNewOrders === "boolean") update.notify_new_orders = notifyNewOrders;
  if (typeof notifyStatusChanges === "boolean") update.notify_status_changes = notifyStatusChanges;

  const { error } = await admin
    .from("ifood_integration")
    .update(update)
    .eq("restaurant_id", restaurantId);

  if (error) throw error;

  const saved = await loadIfoodConfigRow(restaurantId);
  const appConfigured = await hasIfoodSaasAppCredentials(admin);
  return { success: true, config: publicConfigFor(saved, appConfigured) };
};

const publicIfoodItemMappingFor = (row: Record<string, unknown>) => {
  const product = row.product && typeof row.product === "object"
    ? row.product as Record<string, unknown>
    : null;

  return {
    id: String(row.id),
    merchantId: row.merchant_id ? String(row.merchant_id) : null,
    externalItemId: String(row.external_item_id),
    externalItemName: String(row.external_item_name),
    productId: row.product_id ? String(row.product_id) : null,
    productName: product?.name ? String(product.name) : null,
    timesSeen: Number(row.times_seen || 0),
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
    mappedAt: row.mapped_at ? String(row.mapped_at) : null,
  };
};

const listItemMappings = async (restaurantId: string) => {
  const { data, error } = await admin
    .from("ifood_item_mappings")
    .select(`
      id,
      merchant_id,
      external_item_id,
      external_item_name,
      product_id,
      times_seen,
      last_seen_at,
      mapped_at,
      product:products!ifood_item_mappings_product_id_fkey (
        id,
        name
      )
    `)
    .eq("restaurant_id", restaurantId)
    .order("product_id", { ascending: true, nullsFirst: true })
    .order("last_seen_at", { ascending: false });

  if (error) throw error;

  return {
    success: true,
    mappings: (data ?? []).map((row) => publicIfoodItemMappingFor(row as Record<string, unknown>)),
  };
};

const saveItemMapping = async (
  restaurantId: string,
  userId: string,
  payload: Record<string, unknown>,
) => {
  const mappingId = String(payload.mappingId || payload.id || "").trim();
  const productId = String(payload.productId || "").trim() || null;

  if (!mappingId) throw new Error("mappingId é obrigatório.");

  const { data: mapping, error: mappingError } = await admin
    .from("ifood_item_mappings")
    .select("id")
    .eq("id", mappingId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (mappingError) throw mappingError;
  if (!mapping?.id) throw new Error("Mapeamento iFood não encontrado.");

  if (productId) {
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (productError) throw productError;
    if (!product?.id) throw new Error("Produto não encontrado para este restaurante.");
  }

  const { error } = await admin
    .from("ifood_item_mappings")
    .update({
      product_id: productId,
      mapped_at: productId ? new Date().toISOString() : null,
      mapped_by: productId ? userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mappingId)
    .eq("restaurant_id", restaurantId);

  if (error) throw error;

  return await listItemMappings(restaurantId);
};


serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let detectedAction: Action | undefined;
  let detectedRestaurantId: string | undefined;

  try {
    const user = await getAuthenticatedUser(req);
    const payload = await req.json().catch(() => ({}));
    const action = (payload.action || "test") as Action;
    detectedAction = action;
    const restaurantId = await resolveRestaurantId(user.id, payload.restaurantId);
    detectedRestaurantId = restaurantId;

    if (action === "get_config") {
      return jsonResponse(await getPublicConfig(restaurantId));
    }

    if (action === "save_config") {
      return jsonResponse(await saveConfig(restaurantId, payload));
    }

    if (action === "toggle") {
      return jsonResponse(await toggleConfig(restaurantId, payload.enabled));
    }

    if (action === "update_notifications") {
      return jsonResponse(await updateNotificationConfig(restaurantId, payload));
    }

    if (action === "update_polling") {
      return jsonResponse(await updatePollingConfig(restaurantId, payload));
    }

    if (action === "list_item_mappings") {
      return jsonResponse(await listItemMappings(restaurantId));
    }

    if (action === "save_item_mapping") {
      return jsonResponse(await saveItemMapping(restaurantId, user.id, payload));
    }

    if (action === "update_order_status") {
      const orderId = String(payload.orderId || payload.order_id || "").trim();
      const pubfyStatus = String(payload.pubfyStatus || payload.status || "").trim();
      if (!orderId || !pubfyStatus) {
        throw new Error("orderId e pubfyStatus são obrigatórios.");
      }
      return jsonResponse(await updateOrderStatusOnIfood(restaurantId, orderId, pubfyStatus));
    }

    const config = await loadIfoodConfig(restaurantId);

    if (action === "test") {
      await getIfoodAccessToken(config);
      return jsonResponse({
        success: true,
        merchantId: config.merchant_id,
        message: "Token obtido com sucesso no iFood.",
      });
    }

    if (action === "poll") {
      return jsonResponse(await pollIfoodEvents(admin, restaurantId, config as IfoodPollConfig));
    }

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("ifood-integration error:", error);
    await captureEdgeException(error, {
      functionName: "ifood-integration",
      req,
      tags: { action: detectedAction ?? "unknown" },
      extra: { restaurant_id: detectedRestaurantId },
    });
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      400,
    );
  }
});
