import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

type Action = "get_config" | "save_config" | "toggle" | "update_polling" | "test" | "poll";

type IfoodConfig = {
  restaurant_id: string;
  client_id: string;
  client_secret: string;
  merchant_id: string;
  restaurant_ifood_id: string | null;
  is_enabled: boolean;
  polling_enabled: boolean;
  polling_interval: number;
  webhook_url: string | null;
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

const publicConfigFor = (config: Partial<IfoodConfig> | null) => ({
  clientId: config?.client_id || "",
  merchantId: config?.merchant_id || "",
  restaurantIfoodId: config?.restaurant_ifood_id || "",
  isEnabled: Boolean(config?.is_enabled),
  pollingEnabled: config?.polling_enabled ?? true,
  pollingInterval: config?.polling_interval ?? 60,
  webhookUrl: config?.webhook_url || null,
  hasStoredCredentials: Boolean(config?.client_secret),
});

const loadIfoodConfigRow = async (restaurantId: string) => {
  const { data, error } = await admin
    .from("ifood_integration")
    .select("restaurant_id, client_id, client_secret, merchant_id, restaurant_ifood_id, is_enabled, polling_enabled, polling_interval, webhook_url")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw error;
  return data as IfoodConfig | null;
};

const loadIfoodConfig = async (restaurantId: string): Promise<IfoodConfig> => {
  const data = await loadIfoodConfigRow(restaurantId);
  if (!data) throw new Error("Configuração do iFood não encontrada");
  if (!data.client_id || !data.client_secret || !data.merchant_id) {
    throw new Error("Credenciais do iFood incompletas");
  }
  return data;
};

const getPublicConfig = async (restaurantId: string) => {
  const config = await loadIfoodConfigRow(restaurantId);
  return {
    success: true,
    config: publicConfigFor(config),
  };
};

const saveConfig = async (restaurantId: string, payload: Record<string, unknown>) => {
  const existing = await loadIfoodConfigRow(restaurantId);
  const clientId = String(payload.clientId || "").trim();
  const clientSecret = String(payload.clientSecret || "").trim();
  const merchantId = String(payload.merchantId || "").trim();
  const restaurantIfoodId = String(payload.restaurantIfoodId || payload.ifoodRestaurantId || "").trim();
  const pollingInterval = Math.min(300, Math.max(30, Number(payload.pollingInterval || existing?.polling_interval || 60)));

  if (!clientId || !merchantId) {
    throw new Error("Client ID e Merchant ID são obrigatórios.");
  }

  if (!clientSecret && !existing?.client_secret) {
    throw new Error("Client Secret é obrigatório na primeira configuração.");
  }

  const baseConfig = {
    client_id: clientId,
    merchant_id: merchantId,
    restaurant_ifood_id: restaurantIfoodId || null,
    is_enabled: typeof payload.isEnabled === "boolean" ? payload.isEnabled : Boolean(existing?.is_enabled),
    polling_enabled: typeof payload.pollingEnabled === "boolean" ? payload.pollingEnabled : (existing?.polling_enabled ?? true),
    polling_interval: pollingInterval,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await admin
      .from("ifood_integration")
      .update({
        ...baseConfig,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      })
      .eq("restaurant_id", restaurantId);

    if (error) throw error;
  } else {
    const { error } = await admin
      .from("ifood_integration")
      .insert({
        restaurant_id: restaurantId,
        ...baseConfig,
        client_secret: clientSecret,
      });

    if (error) throw error;
  }

  const saved = await loadIfoodConfigRow(restaurantId);
  return {
    success: true,
    config: publicConfigFor(saved),
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
  return {
    success: true,
    config: publicConfigFor(saved),
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
  return {
    success: true,
    config: publicConfigFor(saved),
  };
};

const ifoodFetch = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`https://merchant-api.ifood.com.br${path}`, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.message || body?.error_description || body?.error || response.statusText;
    throw new Error(`iFood ${response.status}: ${message}`);
  }
  return body;
};

const getIfoodToken = async (config: IfoodConfig) => {
  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId: config.client_id,
    clientSecret: config.client_secret,
  });

  const data = await ifoodFetch("/authentication/v1.0/oauth/token", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const token = data?.accessToken || data?.access_token;
  if (!token) throw new Error("Token do iFood não retornado");
  return token as string;
};

const normalizeMoney = (value: unknown): number => {
  if (typeof value === "number") return value > 1000 ? value / 100 : value;
  if (typeof value === "string") return Number(value.replace(",", ".")) || 0;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return normalizeMoney(obj.value ?? obj.amount ?? obj.total ?? obj.orderAmount);
  }
  return 0;
};

const read = (obj: unknown, path: string, fallback: unknown = null) => {
  const result = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, obj);
  return result ?? fallback;
};

const mapStatus = (status?: string) => {
  switch (status) {
    case "CANCELLED":
    case "CAN":
      return "cancelado";
    case "CONCLUDED":
    case "CON":
      return "finalizado";
    case "CONFIRMED":
    case "ACCEPTED":
    case "CFM":
    case "DSP":
    case "RTP":
      return "preparo";
    default:
      return "pendente";
  }
};

const orderTypeFor = (orderType?: string) => {
  if (orderType === "DELIVERY") return "delivery";
  if (orderType === "TAKEOUT") return "balcao";
  return "delivery";
};

const importOrder = async (restaurantId: string, order: Record<string, unknown>) => {
  const ifoodId = String(order.id || "");
  if (!ifoodId) return false;

  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("ifood_id", ifoodId)
    .maybeSingle();

  if (existing?.id) return false;

  const orderType = String(order.orderType || order.type || "DELIVERY");
  const displayId = String(order.displayId || order.shortReference || ifoodId.slice(0, 8));
  const customerName = String(read(order, "customer.name", "Cliente iFood"));
  const customerPhone = String(
    read(order, "customer.phone.number", read(order, "customer.phone", "")),
  ) || null;
  const total = normalizeMoney(read(order, "total.orderAmount", read(order, "total", 0)));
  const paymentMethod = String(read(order, "payments.methods.0.method", read(order, "payments.0.method", ""))) || null;

  const { data: inserted, error } = await admin
    .from("orders")
    .insert({
      restaurant_id: restaurantId,
      customer_name: customerName,
      customer_phone: customerPhone,
      order_type: orderTypeFor(orderType),
      status: mapStatus(String(order.status || "PLACED")),
      total,
      payment_method: paymentMethod,
      source: "ifood",
      ifood_id: ifoodId,
      order_number: displayId,
    })
    .select("id")
    .single();

  if (error) throw error;

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const items = rawItems.map((item) => {
    const row = item as Record<string, unknown>;
    const quantity = Number(row.quantity || 1);
    const itemTotal = normalizeMoney(row.totalPrice ?? row.price ?? row.unitPrice);
    return {
      order_id: inserted.id,
      product_id: null,
      product_name: String(row.name || "Item iFood"),
      quantity,
      price: quantity > 0 ? itemTotal / quantity : itemTotal,
      observations: String(row.observations || row.notes || read(row, "options.0.name", "")) || null,
    };
  });

  if (items.length > 0) {
    console.info("iFood order imported with unmapped stock items", {
      restaurantId,
      ifoodId,
      orderId: inserted.id,
      unmappedItems: items.length,
    });
  }

  if (items.length > 0) {
    const { error: itemsError } = await admin.from("order_items").insert(items);
    if (itemsError) throw itemsError;
  }

  return true;
};

const pollEvents = async (restaurantId: string, config: IfoodConfig) => {
  if (!config.is_enabled) throw new Error("Integração com iFood está desativada");

  const token = await getIfoodToken(config);
  const eventsPayload = await ifoodFetch("/events/v1.0/events:polling?groups=ORDER_STATUS", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-polling-merchants": config.merchant_id,
    },
  }).catch((error) => {
    if (error instanceof Error && error.message.includes("iFood 204")) return [];
    throw error;
  });

  const events: IfoodEvent[] = Array.isArray(eventsPayload)
    ? eventsPayload
    : Array.isArray(eventsPayload?.events)
      ? eventsPayload.events
      : [];

  let eventsStored = 0;
  let ordersImported = 0;
  const acknowledgedIds: string[] = [];

  for (const event of events.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))) {
    if (!event.id) continue;

    const { error: eventError } = await admin.from("ifood_events").upsert({
      id: event.id,
      restaurant_id: restaurantId,
      merchant_id: String(event.merchantId || config.merchant_id),
      order_id: event.orderId || null,
      code: event.code || null,
      full_code: event.fullCode || null,
      payload: event,
      processed_at: new Date().toISOString(),
      error: null,
    }, { onConflict: "id" });

    if (eventError) throw eventError;
    eventsStored++;

    if (event.orderId) {
      try {
        const order = await ifoodFetch(`/order/v1.0/orders/${event.orderId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (await importOrder(restaurantId, order)) ordersImported++;
        acknowledgedIds.push(event.id);
      } catch (error) {
        await admin
          .from("ifood_events")
          .update({ error: error instanceof Error ? error.message : "Erro ao importar pedido" })
          .eq("id", event.id);
      }
    } else {
      acknowledgedIds.push(event.id);
    }
  }

  if (acknowledgedIds.length > 0) {
    await ifoodFetch("/events/v1.0/events/acknowledgment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(acknowledgedIds),
    });

    await admin
      .from("ifood_events")
      .update({ acknowledged_at: new Date().toISOString() })
      .in("id", acknowledgedIds);
  }

  return {
    success: true,
    eventsReceived: events.length,
    eventsStored,
    eventsAcknowledged: acknowledgedIds.length,
    ordersImported,
  };
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

    if (action === "update_polling") {
      return jsonResponse(await updatePollingConfig(restaurantId, payload));
    }

    const config = await loadIfoodConfig(restaurantId);

    if (action === "test") {
      await getIfoodToken(config);
      return jsonResponse({
        success: true,
        merchantId: config.merchant_id,
        message: "Token obtido com sucesso no iFood.",
      });
    }

    if (action === "poll") {
      return jsonResponse(await pollEvents(restaurantId, config));
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
