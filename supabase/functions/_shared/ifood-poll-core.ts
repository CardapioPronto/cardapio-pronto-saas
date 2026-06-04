import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { loadIfoodSaasAppCredentials } from "./ifood-api.ts";

export type IfoodPollConfig = {
  restaurant_id: string;
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

const getIfoodToken = async (admin: SupabaseClient) => {
  const appCredentials = await loadIfoodSaasAppCredentials(admin);
  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId: appCredentials.client_id,
    clientSecret: appCredentials.client_secret,
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

type StockSyncResult = {
  action: "apply" | "revert" | "skip";
  error?: string;
};

type ImportOrderResult = {
  outcome: ImportOrderOutcome;
  stockSync?: StockSyncResult;
};

type IfoodItemMapping = {
  product_id: string | null;
};

const normalizeExternalItemId = (item: Record<string, unknown>) => {
  const explicitId = item.id
    ?? item.externalCode
    ?? item.external_code
    ?? item.integrationId
    ?? item.integration_id
    ?? item.code
    ?? item.sku;

  if (explicitId) return String(explicitId).trim();

  const name = String(item.name || "Item iFood").trim().toLowerCase();
  return `name:${name.replace(/\s+/g, "-")}`;
};

const loadIfoodItemMappings = async (
  admin: SupabaseClient,
  restaurantId: string,
  externalItemIds: string[],
) => {
  const uniqueIds = Array.from(new Set(externalItemIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, IfoodItemMapping>();

  const { data, error } = await admin
    .from("ifood_item_mappings")
    .select("external_item_id, product_id")
    .eq("restaurant_id", restaurantId)
    .in("external_item_id", uniqueIds);

  if (error) throw error;

  return new Map(
    (data ?? []).map((row) => [
      String(row.external_item_id),
      { product_id: row.product_id ? String(row.product_id) : null },
    ]),
  );
};

const recordIfoodItemObservation = async (
  admin: SupabaseClient,
  restaurantId: string,
  merchantId: string | null,
  orderId: string,
  externalItemId: string,
  externalItemName: string,
  mappedProductId: string | null,
) => {
  const now = new Date().toISOString();

  const { data: current, error: readError } = await admin
    .from("ifood_item_mappings")
    .select("id, product_id, times_seen")
    .eq("restaurant_id", restaurantId)
    .eq("external_item_id", externalItemId)
    .maybeSingle();

  if (readError) throw readError;

  if (current?.id) {
    const { error } = await admin
      .from("ifood_item_mappings")
      .update({
        merchant_id: merchantId,
        external_item_name: externalItemName,
        product_id: current.product_id || mappedProductId,
        last_order_id: orderId,
        times_seen: Number(current.times_seen || 0) + 1,
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", current.id);

    if (error) throw error;
    return;
  }

  const { error } = await admin
    .from("ifood_item_mappings")
    .insert({
      restaurant_id: restaurantId,
      merchant_id: merchantId,
      external_item_id: externalItemId,
      external_item_name: externalItemName,
      product_id: mappedProductId,
      last_order_id: orderId,
      first_seen_at: now,
      last_seen_at: now,
      times_seen: 1,
    });

  if (error) throw error;
};

const syncStockForIfoodOrder = async (
  admin: SupabaseClient,
  orderId: string,
  status: string,
): Promise<StockSyncResult> => {
  const mappedStatus = status.toLowerCase();

  if (mappedStatus === "cancelado" || mappedStatus === "pagamento_falhou") {
    const { error } = await admin.rpc("revert_stock_for_order", {
      p_order_id: orderId,
    });
    return error
      ? { action: "revert", error: error.message }
      : { action: "revert" };
  }

  const { error } = await admin.rpc("apply_stock_for_order", {
    p_order_id: orderId,
    p_allow_negative: false,
  });

  return error
    ? { action: "apply", error: error.message }
    : { action: "apply" };
};

const importOrder = async (
  admin: SupabaseClient,
  restaurantId: string,
  order: Record<string, unknown>,
): Promise<ImportOrderResult> => {
  const ifoodId = String(order.id || "");
  if (!ifoodId) return { outcome: "unchanged" };

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

      return {
        outcome: "status_updated",
        stockSync: await syncStockForIfoodOrder(admin, existing.id, mappedStatus),
      };
    }
    return { outcome: "unchanged" };
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
  const itemRows = rawItems.map((item) => item as Record<string, unknown>);
  const externalItemIds = itemRows.map(normalizeExternalItemId);
  const itemMappings = await loadIfoodItemMappings(admin, restaurantId, externalItemIds);
  const merchantId = String(read(order, "merchant.id", order.merchantId || "")) || null;

  const items = itemRows.map((row, index) => {
    const quantity = Number(row.quantity || 1);
    const itemTotal = normalizeMoney(row.totalPrice ?? row.price ?? row.unitPrice);
    const externalItemId = externalItemIds[index];
    const mappedProductId = itemMappings.get(externalItemId)?.product_id ?? null;
    return {
      order_id: inserted.id,
      product_id: mappedProductId,
      product_name: String(row.name || "Item iFood"),
      quantity,
      price: quantity > 0 ? itemTotal / quantity : itemTotal,
      observations: String(row.observations || row.notes || read(row, "options.0.name", "")) || null,
    };
  });

  const unmappedItems = items.filter((item) => !item.product_id).length;
  if (unmappedItems > 0) {
    console.info("iFood order imported with unmapped stock items", {
      restaurantId,
      ifoodId,
      orderId: inserted.id,
      unmappedItems,
    });
  }

  if (items.length > 0) {
    const { error: itemsError } = await admin.from("order_items").insert(items);
    if (itemsError) throw itemsError;

    await Promise.all(itemRows.map((row, index) =>
      recordIfoodItemObservation(
        admin,
        restaurantId,
        merchantId,
        inserted.id,
        externalItemIds[index],
        String(row.name || "Item iFood"),
        itemMappings.get(externalItemIds[index])?.product_id ?? null,
      )
    ));
  }

  return {
    outcome: "imported",
    stockSync: items.some((item) => item.product_id)
      ? await syncStockForIfoodOrder(admin, inserted.id, mappedStatus)
      : { action: "skip" },
  };
};

/** Consulta eventos iFood, importa pedidos e confirma (ACK) ao marketplace. */
export async function pollIfoodEvents(
  admin: SupabaseClient,
  restaurantId: string,
  config: IfoodPollConfig,
): Promise<IfoodPollResult> {
  if (!config.is_enabled) throw new Error("Integração com iFood está desativada");

  const token = await getIfoodToken(admin);
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
        const importResult = order
          ? await importOrder(admin, restaurantId, order as Record<string, unknown>)
          : { outcome: "unchanged" as const };
        if (importResult.outcome === "imported") ordersImported++;
        if (importResult.outcome === "status_updated") ordersStatusUpdated++;
        if (importResult.stockSync?.error) {
          console.warn("iFood order imported but stock sync failed", {
            restaurantId,
            orderId: event.orderId,
            action: importResult.stockSync.action,
            error: importResult.stockSync.error,
          });
          await admin
            .from("ifood_events")
            .update({ error: importResult.stockSync.error })
            .eq("id", event.id);
        }
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
