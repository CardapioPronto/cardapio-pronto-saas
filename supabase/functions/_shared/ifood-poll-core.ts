import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

export type IfoodPollConfig = {
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

export type IfoodPollResult = {
  success: true;
  eventsReceived: number;
  eventsStored: number;
  eventsAcknowledged: number;
  ordersImported: number;
  ordersStatusUpdated: number;
};

const ifoodFetch = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`https://merchant-api.ifood.com.br${path}`, init);
  const text = await response.text();
  let body: Record<string, unknown> | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`iFood ${response.status}: resposta inválida`);
    }
  }
  if (!response.ok) {
    const message = String(
      body?.message || body?.error_description || body?.error || response.statusText,
    );
    throw new Error(`iFood ${response.status}: ${message}`);
  }
  return body;
};

const getIfoodToken = async (config: IfoodPollConfig) => {
  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId: config.client_id,
    clientSecret: config.client_secret,
  });

  const data = await ifoodFetch("/authentication/v1.0/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const token = data?.accessToken || data?.access_token;
  if (!token) throw new Error("Token do iFood não retornado");
  return String(token);
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

type ImportOrderOutcome = "imported" | "status_updated" | "unchanged";

const importOrder = async (
  admin: SupabaseClient,
  restaurantId: string,
  order: Record<string, unknown>,
): Promise<ImportOrderOutcome> => {
  const ifoodId = String(order.id || "");
  if (!ifoodId) return "unchanged";

  const { data: existing } = await admin
    .from("orders")
    .select("id, status")
    .eq("restaurant_id", restaurantId)
    .eq("ifood_id", ifoodId)
    .maybeSingle();

  const mappedStatus = mapStatus(String(order.status || "PLACED"));

  if (existing?.id) {
    if (existing.status !== mappedStatus) {
      const { error: statusError } = await admin
        .from("orders")
        .update({ status: mappedStatus, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (statusError) throw statusError;
      return "status_updated";
    }
    return "unchanged";
  }

  const orderType = String(order.orderType || order.type || "DELIVERY");
  const displayId = String(order.displayId || order.shortReference || ifoodId.slice(0, 8));
  const customerName = String(read(order, "customer.name", "Cliente iFood"));
  const customerPhone = String(
    read(order, "customer.phone.number", read(order, "customer.phone", "")),
  ) || null;
  const total = normalizeMoney(read(order, "total.orderAmount", read(order, "total", 0)));
  const paymentMethod = String(
    read(order, "payments.methods.0.method", read(order, "payments.0.method", "")),
  ) || null;

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

  return "imported";
};

/** Consulta eventos iFood, importa pedidos e confirma (ACK) ao marketplace. */
export async function pollIfoodEvents(
  admin: SupabaseClient,
  restaurantId: string,
  config: IfoodPollConfig,
): Promise<IfoodPollResult> {
  if (!config.is_enabled) throw new Error("Integração com iFood está desativada");

  const token = await getIfoodToken(config);
  const eventsPayload = await ifoodFetch("/events/v1.0/events:polling?groups=ORDER_STATUS", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-polling-merchants": config.merchant_id,
    },
  }).catch((error) => {
    if (error instanceof Error && error.message.includes("iFood 204")) return [];
    throw error;
  });

  const events: IfoodEvent[] = Array.isArray(eventsPayload)
    ? eventsPayload as IfoodEvent[]
    : Array.isArray((eventsPayload as { events?: IfoodEvent[] })?.events)
      ? (eventsPayload as { events: IfoodEvent[] }).events
      : [];

  let eventsStored = 0;
  let ordersImported = 0;
  let ordersStatusUpdated = 0;
  const acknowledgedIds: string[] = [];

  for (const event of events.sort((a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  )) {
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
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const outcome = order
          ? await importOrder(admin, restaurantId, order as Record<string, unknown>)
          : "unchanged";
        if (outcome === "imported") ordersImported++;
        if (outcome === "status_updated") ordersStatusUpdated++;
        acknowledgedIds.push(event.id);
      } catch (error) {
        await admin
          .from("ifood_events")
          .update({
            error: error instanceof Error ? error.message : "Erro ao importar pedido",
          })
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
        Authorization: `Bearer ${token}`,
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
    ordersStatusUpdated,
  };
}
