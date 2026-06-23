import type { Page, Route } from "@playwright/test";

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000101";
const OWNER_ID = "00000000-0000-4000-8000-000000000201";
const EMPLOYEE_ID = "00000000-0000-4000-8000-000000000202";
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

const tableRows = (table: string, role: AuthenticatedRole) => {
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
      return [{
        id: "00000000-0000-4000-8000-000000000301",
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
        category: {
          id: "00000000-0000-4000-8000-000000000401",
          name: "Lanches",
          restaurant_id: RESTAURANT_ID,
        },
      }];
    case "categories":
      return [{
        id: "00000000-0000-4000-8000-000000000401",
        restaurant_id: RESTAURANT_ID,
        name: "Lanches",
      }];
    case "mesas":
      return [{
        id: "00000000-0000-4000-8000-000000000501",
        restaurant_id: RESTAURANT_ID,
        number: 1,
        name: "Mesa 1",
        status: "livre",
        is_active: true,
        area_id: "00000000-0000-4000-8000-000000000601",
        updated_at: now,
      }];
    case "areas":
      return [{
        id: "00000000-0000-4000-8000-000000000601",
        restaurant_id: RESTAURANT_ID,
        name: "Salão",
        is_active: true,
      }];
    case "orders":
      return [{
        id: "00000000-0000-4000-8000-000000000701",
        restaurant_id: RESTAURANT_ID,
        customer_name: "Cliente E2E",
        total: 59.8,
        status: "pendente",
        created_at: now,
      }];
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
    await fulfillJson(route, rpcPayload(rpcName, role, subscriptionScenario));
    return;
  }

  if (url.pathname.startsWith("/functions/v1/")) {
    await fulfillJson(route, { alerts: [], summary: null });
    return;
  }

  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.replace("/rest/v1/", "").split("/")[0];
    const rows = tableRows(table, role);
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
) {
  const session = createSession(role);

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
      handleSupabaseRequest(route, role, subscriptionScenario),
    );
  }
}
