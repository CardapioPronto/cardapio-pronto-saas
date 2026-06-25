import type { Page, Route } from "@playwright/test";

const RESTAURANT_ID = "00000000-0000-4000-8000-000000002101";
const CATEGORY_ID = "00000000-0000-4000-8000-000000002201";
const PRODUCT_ID = "00000000-0000-4000-8000-000000002301";
const SUPABASE_HOSTS = [
  "jyrfjvyeikhqpuwcvdff.supabase.co",
  "example.supabase.co",
] as const;

type JsonRecord = Record<string, unknown>;

export type PublicMenuOrder = {
  orderId: string;
  trackingId: string;
  payload: JsonRecord;
};

export type PublicCouponValidation = {
  code: string;
  orderValue: number;
};

export type PublicCrmCapture = {
  orderId: string | null;
  acceptsMarketing: boolean | null;
  source: string | null;
};

export type PublicMenuSupabaseMockControls = {
  getCreatedOrders: () => PublicMenuOrder[];
  getCouponValidations: () => PublicCouponValidation[];
  getCrmCaptures: () => PublicCrmCapture[];
};

type PublicMenuMockState = {
  createdOrders: PublicMenuOrder[];
  couponValidations: PublicCouponValidation[];
  crmCaptures: PublicCrmCapture[];
  trackingOrders: Map<string, JsonRecord>;
};

const createMockState = (): PublicMenuMockState => ({
  createdOrders: [],
  couponValidations: [],
  crmCaptures: [],
  trackingOrders: new Map(),
});

const categoryRow = () => ({
  id: CATEGORY_ID,
  restaurant_id: RESTAURANT_ID,
  name: "Pizzas",
  order_position: 1,
});

const productRow = () => ({
  id: PRODUCT_ID,
  restaurant_id: RESTAURANT_ID,
  category_id: CATEGORY_ID,
  name: "Pizza Pública E2E",
  description: "Produto público determinístico para o checkout",
  price: 42.9,
  image_url: null,
  available: true,
  order_position: 1,
  stock_tracking_enabled: false,
  stock_quantity: 20,
  multi_flavor_enabled: false,
});

const parseRequestBody = (route: Route): JsonRecord => {
  const raw = route.request().postData();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as JsonRecord : {};
  } catch {
    return {};
  }
};

const applyRestFilters = (rows: unknown[], url: URL) => {
  let filtered = [...rows];

  for (const [key, value] of url.searchParams.entries()) {
    if (!value.startsWith("eq.")) continue;
    const expected = value.slice(3);
    filtered = filtered.filter((row) => {
      if (!row || typeof row !== "object") return false;
      return String((row as Record<string, unknown>)[key] ?? "") === expected;
    });
  }

  return filtered;
};

const tableRows = (table: string) => {
  const now = new Date().toISOString();

  switch (table) {
    case "restaurants":
      return [{
        id: RESTAURANT_ID,
        name: "Restaurante Público E2E",
        logo_url: null,
        banner_url: null,
        slug: "publico-e2e",
        address: "Rua Pública, 100",
        phone: "11999999999",
        phone_whatsapp: "11999999999",
        business_hours: "Aberto agora",
        category: "Pizzaria",
        active: true,
      }];
    case "categories":
      return [categoryRow()];
    case "products":
      return [productRow()];
    case "menu_themes":
      return [{
        id: "00000000-0000-4000-8000-000000002401",
        name: "delivery",
        display_name: "Delivery",
        description: "Tema delivery",
        preview_image_url: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      }];
    case "restaurant_menu_config":
      return [{
        id: "00000000-0000-4000-8000-000000002501",
        restaurant_id: RESTAURANT_ID,
        theme_id: "00000000-0000-4000-8000-000000002401",
        custom_colors: {},
        custom_settings: {},
        is_active: true,
        created_at: now,
        updated_at: now,
      }];
    case "restaurant_settings":
      return [{
        id: "00000000-0000-4000-8000-000000002601",
        restaurant_id: RESTAURANT_ID,
        setting_key: "delivery_config",
        setting_value: {
          delivery_enabled: true,
          pickup_enabled: true,
          delivery_fee: 7.5,
          min_order_value: 0,
          estimated_delivery_minutes: 35,
          delivery_radius_km: 5,
          payment_methods: ["pix", "dinheiro", "cartao_credito", "cartao_debito"],
        },
      }, {
        id: "00000000-0000-4000-8000-000000002602",
        restaurant_id: RESTAURANT_ID,
        setting_key: "multi_flavor_config",
        setting_value: {
          enabled: false,
          max_flavors: 2,
          pricing_strategy: "highest",
        },
      }];
    default:
      return [];
  }
};

const validateCoupon = (
  state: PublicMenuMockState,
  requestBody: JsonRecord,
) => {
  const code = String(requestBody.p_code ?? "").toUpperCase();
  const orderValue = Number(requestBody.p_order_value ?? 0);
  state.couponValidations.push({ code, orderValue });

  if (code !== "E2E10") {
    return {
      valid: false,
      message: "Cupom inválido para o teste.",
    };
  }

  return {
    valid: true,
    code: "E2E10",
    title: "Cupom E2E",
    message: "Cupom aplicado com sucesso.",
    discount: 10,
  };
};

const createPublicOrder = (
  state: PublicMenuMockState,
  requestBody: JsonRecord,
) => {
  const payload = (requestBody.payload && typeof requestBody.payload === "object"
    ? requestBody.payload
    : {}) as JsonRecord;
  const orderIndex = state.createdOrders.length + 1;
  const orderId = `00000000-0000-4000-8000-00000000280${orderIndex}`;
  const trackingId = `public-track-e2e-${orderIndex}`;
  const items = Array.isArray(payload.items) ? payload.items as JsonRecord[] : [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity ?? 1) * productRow().price,
    0,
  );
  const discount = payload.coupon_code === "E2E10" ? 10 : 0;
  const deliveryFee = Number(payload.delivery_fee ?? 0);
  const total = Math.max(subtotal - discount, 0) + deliveryFee;
  const deliveryOrderId = `00000000-0000-4000-8000-00000000290${orderIndex}`;
  const createdAt = new Date().toISOString();

  state.createdOrders.push({ orderId, trackingId, payload });
  state.trackingOrders.set(trackingId, {
    id: trackingId,
    status: "pending",
    payment_status: null,
    fulfillment_type: payload.fulfillment_type ?? "delivery",
    estimated_delivery_minutes: payload.estimated_delivery_minutes ?? 35,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    payment_method: payload.payment_method ?? "pix",
    customer_name: payload.customer_name ?? null,
    created_at: createdAt,
    restaurant: {
      name: "Restaurante Público E2E",
      logo_url: null,
      phone_whatsapp: "11999999999",
    },
    items: items.map((item, index) => ({
      id: `${orderId}-item-${index + 1}`,
      product_name: "Pizza Pública E2E",
      name: "Pizza Pública E2E",
      quantity: Number(item.quantity ?? 1),
      price: productRow().price,
      observations: item.observations ?? null,
      flavor_selection: null,
    })),
    history: [{
      new_status: "pending",
      created_at: createdAt,
    }],
  });

  return {
    tracking_id: trackingId,
    order_id: orderId,
    delivery_order_id: deliveryOrderId,
    order_number: "E2E-001",
    fulfillment_type: payload.fulfillment_type ?? "delivery",
    discount_amount: discount,
    total,
  };
};

const rpcPayload = (
  name: string,
  state: PublicMenuMockState,
  requestBody: JsonRecord,
) => {
  switch (name) {
    case "track_public_menu_event":
      return { tracked: true };
    case "upsert_public_cart_abandonment_session":
      return { upserted: true };
    case "get_public_loyalty_quote":
      return {
        enabled: false,
        balance: 0,
        max_redeem_amount: 0,
        earn_estimate: 0,
      };
    case "get_public_restaurant_promotions":
      return [];
    case "get_public_menu_upsell":
      return {};
    case "get_public_restaurant_payment_settings":
      return {
        enabled: false,
        methods: [],
        allowedFulfillment: [],
        onboardingStatus: "not_started",
      };
    case "validate_public_coupon":
      return validateCoupon(state, requestBody);
    case "create_public_menu_order":
      return createPublicOrder(state, requestBody);
    case "capture_crm_lead_from_order":
      state.crmCaptures.push({
        orderId: typeof requestBody.p_order_id === "string" ? requestBody.p_order_id : null,
        acceptsMarketing: typeof requestBody.p_accepts_marketing === "boolean"
          ? requestBody.p_accepts_marketing
          : null,
        source: typeof requestBody.p_source === "string" ? requestBody.p_source : null,
      });
      return {
        captured: true,
        order_id: requestBody.p_order_id ?? null,
      };
    case "get_public_order_tracking":
      return state.trackingOrders.get(String(requestBody.p_tracking_id ?? "")) ?? null;
    default:
      return {};
  }
};

const fulfillJson = async (
  route: Route,
  payload: unknown,
  options?: { count?: number; head?: boolean },
) => {
  const count = options?.count ?? (Array.isArray(payload) ? payload.length : payload ? 1 : 0);
  const contentRange = count > 0 ? `0-${count - 1}/${count}` : "*/0";
  await route.fulfill({
    status: 200,
    headers: {
      "access-control-allow-origin": "*",
      "content-type": "application/json",
      "content-range": contentRange,
    },
    body: options?.head ? "" : JSON.stringify(payload),
  });
};

const handleSupabaseRequest = async (
  route: Route,
  state: PublicMenuMockState,
) => {
  const request = route.request();
  const url = new URL(request.url());

  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    return;
  }

  if (url.pathname === "/auth/v1/health") {
    await fulfillJson(route, { status: "ok" });
    return;
  }

  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    const rpcName = url.pathname.split("/").at(-1) ?? "";
    await fulfillJson(route, rpcPayload(rpcName, state, parseRequestBody(route)));
    return;
  }

  if (url.pathname.startsWith("/functions/v1/")) {
    await fulfillJson(route, { ok: true });
    return;
  }

  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.replace("/rest/v1/", "").split("/")[0];
    const rows = applyRestFilters(tableRows(table), url);
    const wantsObject = request.headers().accept?.includes("vnd.pgrst.object+json") ?? false;
    await fulfillJson(route, wantsObject ? rows[0] ?? null : rows, {
      count: rows.length,
      head: request.method() === "HEAD",
    });
    return;
  }

  await fulfillJson(route, {});
};

export async function installPublicMenuSupabaseMock(
  page: Page,
): Promise<PublicMenuSupabaseMockControls> {
  const state = createMockState();

  await page.addInitScript(() => {
    window.localStorage.setItem("pubfy_cookie_consent_v1", "accepted");
    window.localStorage.removeItem("pubfy_cart_00000000-0000-4000-8000-000000002101");
  });

  for (const host of SUPABASE_HOSTS) {
    await page.route(`https://${host}/**`, (route) =>
      handleSupabaseRequest(route, state),
    );
  }

  await page.route("https://viacep.com.br/**", (route) =>
    fulfillJson(route, {
      logradouro: "Praça da Sé",
      bairro: "Sé",
      localidade: "São Paulo",
      uf: "SP",
    }),
  );

  return {
    getCreatedOrders: () => [...state.createdOrders],
    getCouponValidations: () => [...state.couponValidations],
    getCrmCaptures: () => [...state.crmCaptures],
  };
}
