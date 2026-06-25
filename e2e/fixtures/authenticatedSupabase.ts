import type { Page, Route } from "@playwright/test";

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000101";
const OWNER_ID = "00000000-0000-4000-8000-000000000201";
const EMPLOYEE_ID = "00000000-0000-4000-8000-000000000202";
const PRODUCT_ID = "00000000-0000-4000-8000-000000000301";
const CATEGORY_ID = "00000000-0000-4000-8000-000000000401";
const TABLE_ID = "00000000-0000-4000-8000-000000000501";
const AREA_ID = "00000000-0000-4000-8000-000000000601";
const EXISTING_ORDER_ID = "00000000-0000-4000-8000-000000000701";
const SUPABASE_HOSTS = [
  "jyrfjvyeikhqpuwcvdff.supabase.co",
  "example.supabase.co",
] as const;

export type AuthenticatedRole = "owner" | "restricted_employee";
export type SubscriptionScenario =
  | "active"
  | "trial_active"
  | "trial_expired"
  | "past_due_grace"
  | "past_due_blocked";

type JsonRecord = Record<string, unknown>;

type MockOrderRow = {
  id: string;
  restaurant_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  status: string;
  source: string;
  order_type: "mesa" | "balcao";
  table_id: string | null;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  order_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    observations: string | null;
    product: {
      category: {
        id: string;
        name: string;
        restaurant_id: string;
      };
    };
  }>;
  mesa: {
    id: string;
    name: string | null;
    number: number;
  } | null;
};

export type CreatedPosOrder = {
  id: string;
  payload: JsonRecord;
};

export type OrderStatusChange = {
  orderId: string;
  status: string;
};

export type AuthenticatedSupabaseMockControls = {
  getCreatedPosOrders: () => CreatedPosOrder[];
  getStatusChanges: () => OrderStatusChange[];
};

type AuthenticatedSupabaseMockState = {
  orders: MockOrderRow[];
  createdPosOrders: CreatedPosOrder[];
  statusChanges: OrderStatusChange[];
};

const ownerPermissions = [
  "dashboard_view",
  "subscription_view",
  "pdv_access",
  "orders_view",
  "orders_manage",
  "orders_metrics_view",
  "products_view",
  "products_manage",
  "reports_view",
  "settings_view",
  "settings_manage",
  "employees_manage",
];

const restrictedEmployeePermissions = ["dashboard_view", "pdv_access"];

const encodeJwtPart = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createSession = (role: AuthenticatedRole) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const id = role === "owner" ? OWNER_ID : EMPLOYEE_ID;
  const email = role === "owner" ? "dono.e2e@pubfy.test" : "operador.e2e@pubfy.test";
  const accessToken = [
    encodeJwtPart({ alg: "none", typ: "JWT" }),
    encodeJwtPart({
      aud: "authenticated",
      exp: nowSeconds + 3600,
      iat: nowSeconds,
      role: "authenticated",
      sub: id,
    }),
    "e2e-signature",
  ].join(".");

  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  };

  return {
    access_token: accessToken,
    refresh_token: `e2e-refresh-${role}`,
    expires_in: 3600,
    expires_at: nowSeconds + 3600,
    token_type: "bearer",
    user,
  };
};

const categoryRow = () => ({
  id: CATEGORY_ID,
  restaurant_id: RESTAURANT_ID,
  name: "Lanches",
});

const productRow = () => ({
  id: PRODUCT_ID,
  restaurant_id: RESTAURANT_ID,
  name: "X-Burger E2E",
  description: "Produto determinístico para o fluxo crítico",
  price: 29.9,
  available: true,
  image_url: null,
  stock_tracking_enabled: false,
  stock_quantity: 20,
  stock_min_quantity: 2,
  stock_is_fractional: false,
  multi_flavor_enabled: false,
  category: categoryRow(),
});

const tableRow = (now: string) => ({
  id: TABLE_ID,
  restaurant_id: RESTAURANT_ID,
  number: 1,
  name: "Mesa 1",
  status: "livre",
  is_active: true,
  area_id: AREA_ID,
  updated_at: now,
});

const createOrderItem = (
  orderId: string,
  item: JsonRecord,
  index: number,
) => {
  const product = productRow();
  const quantity = Number(item.quantity ?? 1);

  return {
    id: `${orderId}-item-${index + 1}`,
    product_id: String(item.product_id ?? PRODUCT_ID),
    product_name: product.name,
    quantity,
    price: product.price,
    observations: typeof item.observations === "string" ? item.observations : null,
    product: {
      category: categoryRow(),
    },
  };
};

const createExistingOrder = (now: string): MockOrderRow => ({
  id: EXISTING_ORDER_ID,
  restaurant_id: RESTAURANT_ID,
  customer_name: "Cliente E2E",
  customer_phone: "11999999999",
  total: 59.8,
  status: "pendente",
  source: "app",
  order_type: "mesa",
  table_id: TABLE_ID,
  payment_method: null,
  payment_status: null,
  created_at: now,
  order_items: [{
    id: `${EXISTING_ORDER_ID}-item-1`,
    product_id: PRODUCT_ID,
    product_name: "X-Burger E2E",
    quantity: 2,
    price: 29.9,
    observations: null,
    product: {
      category: categoryRow(),
    },
  }],
  mesa: {
    id: TABLE_ID,
    name: "Mesa 1",
    number: 1,
  },
});

const createMockState = (): AuthenticatedSupabaseMockState => ({
  orders: [createExistingOrder(new Date().toISOString())],
  createdPosOrders: [],
  statusChanges: [],
});

const summarizeOrders = (orders: MockOrderRow[]) => ({
  totalPedidos: orders.length,
  totalVendido: orders
    .filter((order) => order.status !== "cancelado")
    .reduce((total, order) => total + order.total, 0),
  pedidosAbertos: orders.filter((order) =>
    ["pendente", "preparo", "pronto", "em-andamento"].includes(order.status),
  ).length,
  cancelados: orders.filter((order) => order.status === "cancelado").length,
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

const createPosOrder = (
  state: AuthenticatedSupabaseMockState,
  requestBody: JsonRecord,
) => {
  const payload = (requestBody.payload && typeof requestBody.payload === "object"
    ? requestBody.payload
    : {}) as JsonRecord;
  const orderIndex = state.createdPosOrders.length + 1;
  const orderId = `00000000-0000-4000-8000-00000000080${orderIndex}`;
  const items = Array.isArray(payload.items) ? payload.items as JsonRecord[] : [];
  const orderType = payload.order_type === "mesa" ? "mesa" : "balcao";
  const tableId = orderType === "mesa" && typeof payload.table_id === "string"
    ? payload.table_id
    : null;
  const orderItems = items.map((item, index) => createOrderItem(orderId, item, index));
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const createdAt = new Date().toISOString();
  const row: MockOrderRow = {
    id: orderId,
    restaurant_id: String(payload.restaurant_id ?? RESTAURANT_ID),
    customer_name: typeof payload.customer_name === "string" ? payload.customer_name : null,
    customer_phone: typeof payload.customer_phone === "string" ? payload.customer_phone : null,
    total,
    status: "pendente",
    source: "app",
    order_type: orderType,
    table_id: tableId,
    payment_method: null,
    payment_status: null,
    created_at: createdAt,
    order_items: orderItems,
    mesa: tableId
      ? {
          id: tableId,
          name: "Mesa 1",
          number: 1,
        }
      : null,
  };

  state.orders = [row, ...state.orders];
  state.createdPosOrders.push({ id: orderId, payload });

  return {
    id: orderId,
    order_id: orderId,
    restaurant_id: row.restaurant_id,
    status: row.status,
    total: row.total,
  };
};

const updateOrderStatus = (
  state: AuthenticatedSupabaseMockState,
  requestBody: JsonRecord,
) => {
  const orderId = String(requestBody.p_order_id ?? "");
  const status = String(requestBody.p_status ?? "pendente");
  const order = state.orders.find((item) => item.id === orderId);

  if (order) {
    order.status = status;
  }

  state.statusChanges.push({ orderId, status });

  return {
    id: orderId,
    restaurant_id: order?.restaurant_id ?? RESTAURANT_ID,
    table_id: order?.table_id ?? null,
    status,
    reopened: status === "pendente",
    reverted_stock: status === "cancelado",
  };
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

const tableRows = (
  table: string,
  role: AuthenticatedRole,
  state: AuthenticatedSupabaseMockState,
) => {
  const now = new Date().toISOString();

  switch (table) {
    case "users":
      return [{
        id: role === "owner" ? OWNER_ID : EMPLOYEE_ID,
        email: role === "owner" ? "dono.e2e@pubfy.test" : "operador.e2e@pubfy.test",
        name: role === "owner" ? "Dono E2E" : "Operador E2E",
        restaurant_id: RESTAURANT_ID,
        user_type: role === "owner" ? "owner" : "employee",
        role: "user",
        created_at: now,
        updated_at: now,
      }];
    case "restaurants":
      return [{
        id: RESTAURANT_ID,
        name: "Restaurante E2E",
        active: true,
        slug: "restaurante-e2e",
        address: "Rua dos Testes, 100",
        phone: "11999999999",
        phone_whatsapp: "11999999999",
      }];
    case "products":
      return [productRow()];
    case "categories":
      return [categoryRow()];
    case "mesas":
      return [tableRow(now)];
    case "areas":
      return [{
        id: AREA_ID,
        restaurant_id: RESTAURANT_ID,
        name: "Salão",
        is_active: true,
      }];
    case "orders":
      return state.orders;
    case "system_configurations":
      return [{
        id: "00000000-0000-4000-8000-000000000801",
        restaurant_id: RESTAURANT_ID,
        notification_new_order: true,
        notification_email: true,
        dark_mode: false,
        language: "pt-BR",
        auto_print: false,
        print_paper_size: "80mm",
        print_default_kitchen: true,
        print_default_cashier: false,
        print_default_customer: false,
      }];
    case "restaurant_payment_settings":
      return [{ recipient_status: "active", is_enabled: true, onboarding_status: "completed" }];
    case "restaurant_menu_config":
      return [{ id: "00000000-0000-4000-8000-000000000901", is_active: true }];
    case "conversation_threads":
    case "whatsapp_instances":
    case "order_feedback":
    case "system_admins":
    case "menu_themes":
    default:
      return [];
  }
};

const isoDaysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const subscriptionEntitlement = (scenario: SubscriptionScenario) => {
  const base = {
    has_subscription: true,
    plan_id: "00000000-0000-4000-8000-000000001001",
    plan_name: "Plano E2E",
    trial_ends_at: null as string | null,
    next_billing_at: null as string | null,
  };

  switch (scenario) {
    case "trial_active":
      return {
        ...base,
        status: "trialing",
        is_trial: true,
        trial_ends_at: isoDaysFromNow(5),
        current_period_end: isoDaysFromNow(5),
      };
    case "trial_expired":
      return {
        ...base,
        status: "trialing",
        is_trial: true,
        trial_ends_at: isoDaysFromNow(-1),
        current_period_end: isoDaysFromNow(-1),
      };
    case "past_due_grace":
      return {
        ...base,
        status: "past_due",
        is_trial: false,
        current_period_end: isoDaysFromNow(-2),
      };
    case "past_due_blocked":
      return {
        ...base,
        status: "past_due",
        is_trial: false,
        current_period_end: isoDaysFromNow(-10),
      };
    case "active":
    default:
      return {
        ...base,
        status: "active",
        is_trial: false,
        current_period_end: "2099-12-31T23:59:59.000Z",
        next_billing_at: "2099-12-31T23:59:59.000Z",
      };
  }
};

const rpcPayload = (
  name: string,
  role: AuthenticatedRole,
  subscriptionScenario: SubscriptionScenario,
  state: AuthenticatedSupabaseMockState,
  requestBody: JsonRecord,
) => {
  const permissions = role === "owner" ? ownerPermissions : restrictedEmployeePermissions;

  switch (name) {
    case "get_my_restaurant_access":
      return [{
        restaurant_id: RESTAURANT_ID,
        restaurant_name: "Restaurante E2E",
        restaurant_slug: "restaurante-e2e",
        access_type: role === "owner" ? "owner" : "employee",
        is_active_unit: true,
        group_id: null,
        group_name: null,
        is_group_master: false,
        menu_sync_enabled: false,
        permissions,
      }];
    case "get_restaurant_subscription_entitlement":
      return subscriptionEntitlement(subscriptionScenario);
    case "get_my_subscription_summaries":
      return [];
    case "get_restaurant_dashboard_metrics":
      return {
        stats: {
          totalPedidos: 12,
          faturamento: 1234.56,
          itensVendidos: 27,
          pedidosAbertos: 1,
          ticketMedio: 102.88,
          crescimentoPedidos: 20,
          crescimentoFaturamento: 15,
        },
        popular_products: [{
          id: "00000000-0000-4000-8000-000000000301",
          name: "X-Burger E2E",
          sales: 8,
          revenue: 239.2,
          category: "Lanches",
        }],
        window_days: 30,
      };
    case "get_orders_summary":
      return summarizeOrders(state.orders);
    case "create_pos_order":
      return createPosOrder(state, requestBody);
    case "update_order_status":
      return updateOrderStatus(state, requestBody);
    case "capture_crm_lead_from_order":
      return {
        captured: true,
        order_id: requestBody.p_order_id ?? null,
      };
    case "is_super_admin":
      return false;
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
  role: AuthenticatedRole,
  subscriptionScenario: SubscriptionScenario,
  state: AuthenticatedSupabaseMockState,
) => {
  const request = route.request();
  const url = new URL(request.url());

  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    return;
  }

  if (url.pathname === "/auth/v1/user") {
    await fulfillJson(route, createSession(role).user);
    return;
  }

  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    const rpcName = url.pathname.split("/").at(-1) ?? "";
    await fulfillJson(route, rpcPayload(
      rpcName,
      role,
      subscriptionScenario,
      state,
      parseRequestBody(route),
    ));
    return;
  }

  if (url.pathname.startsWith("/functions/v1/")) {
    await fulfillJson(route, { alerts: [], summary: null });
    return;
  }

  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.replace("/rest/v1/", "").split("/")[0];
    const rows = applyRestFilters(tableRows(table, role, state), url);
    const wantsObject = request.headers().accept?.includes("vnd.pgrst.object+json") ?? false;
    const payload = wantsObject ? rows[0] ?? null : rows;
    await fulfillJson(route, payload, {
      count: rows.length,
      head: request.method() === "HEAD",
    });
    return;
  }

  await fulfillJson(route, {});
};

export async function installAuthenticatedSupabaseMock(
  page: Page,
  role: AuthenticatedRole,
  subscriptionScenario: SubscriptionScenario = "active",
): Promise<AuthenticatedSupabaseMockControls> {
  const session = createSession(role);
  const state = createMockState();

  await page.addInitScript(
    ({ storedSession, storageKeys }) => {
      for (const key of storageKeys) {
        window.localStorage.setItem(key, JSON.stringify(storedSession));
      }
      window.localStorage.setItem("pubfy.activeRestaurantId", "00000000-0000-4000-8000-000000000101");
      window.localStorage.setItem("pubfy_cookie_consent_v1", "accepted");
    },
    {
      storedSession: session,
      storageKeys: SUPABASE_HOSTS.map((host) => `sb-${host.split(".")[0]}-auth-token`),
    },
  );

  for (const host of SUPABASE_HOSTS) {
    await page.route(`https://${host}/**`, (route) =>
      handleSupabaseRequest(route, role, subscriptionScenario, state),
    );
  }

  return {
    getCreatedPosOrders: () => [...state.createdPosOrders],
    getStatusChanges: () => [...state.statusChanges],
  };
}
