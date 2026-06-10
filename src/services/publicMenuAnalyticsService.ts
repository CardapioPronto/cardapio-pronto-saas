import { endOfDay, startOfDay } from "date-fns";
import { supabase, getCurrentRestaurantId } from "@/lib/supabase";
import { assertMaxReportRange } from "@/lib/reportLimits";

export type PublicMenuAnalyticsEventType =
  | "menu_view"
  | "product_click"
  | "add_to_cart"
  | "checkout_started"
  | "order_completed"
  | "search_performed"
  | "search_no_results";

export type PublicMenuFunnelSummary = {
  menuViews: number;
  productClicks: number;
  addToCart: number;
  checkoutStarted: number;
  ordersCompleted: number;
  searches: number;
  searchesWithoutResults: number;
  viewToProductRate: number;
  productToCartRate: number;
  cartToCheckoutRate: number;
  checkoutToOrderRate: number;
  viewToOrderRate: number;
  searchNoResultRate: number;
};

export type PublicMenuFunnelStep = {
  position: number;
  eventType: PublicMenuAnalyticsEventType;
  label: string;
  total: number;
  rateFromPrevious: number;
};

export type PublicMenuFunnelSource = {
  source: string;
  menuViews: number;
  productClicks: number;
  addToCart: number;
  checkoutStarted: number;
  ordersCompleted: number;
  revenue: number;
  conversionRate: number;
};

export type PublicMenuProductDiagnostic = {
  productId: string;
  productName: string;
  categoryName: string | null;
  productClicks: number;
  addToCart: number;
  ordersCompleted: number;
  soldQuantity: number;
  revenue: number;
  clickToCartRate: number;
  cartToOrderRate: number;
  diagnosticCode:
    | "clicked_not_added"
    | "low_cart_conversion"
    | "low_order_conversion"
    | "interest_without_sale"
    | "healthy";
};

export type PublicMenuSearchDiagnostic = {
  query: string;
  searches: number;
  noResults: number;
  maxResultCount: number;
  noResultRate: number;
};

export type PublicMenuConversionFunnel = {
  summary: PublicMenuFunnelSummary;
  steps: PublicMenuFunnelStep[];
  sources: PublicMenuFunnelSource[];
  products: PublicMenuProductDiagnostic[];
  searches: PublicMenuSearchDiagnostic[];
};

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type JsonRecord = Record<string, unknown>;

type TrackPublicMenuEventInput = {
  restaurantId: string;
  eventType: PublicMenuAnalyticsEventType;
  productId?: string | null;
  orderId?: string | null;
  metadata?: JsonRecord;
};

const db = supabase as unknown as RpcClient;

const SESSION_PREFIX = "pubfy_public_menu_session";

const EMPTY_SUMMARY: PublicMenuFunnelSummary = {
  menuViews: 0,
  productClicks: 0,
  addToCart: 0,
  checkoutStarted: 0,
  ordersCompleted: 0,
  searches: 0,
  searchesWithoutResults: 0,
  viewToProductRate: 0,
  productToCartRate: 0,
  cartToCheckoutRate: 0,
  checkoutToOrderRate: 0,
  viewToOrderRate: 0,
  searchNoResultRate: 0,
};

const EMPTY_FUNNEL: PublicMenuConversionFunnel = {
  summary: EMPTY_SUMMARY,
  steps: [],
  sources: [],
  products: [],
  searches: [],
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const getSessionId = (restaurantId: string) => {
  if (typeof window === "undefined") return createSessionId();

  const key = `${SESSION_PREFIX}_${restaurantId}`;
  try {
    const current = window.sessionStorage.getItem(key);
    if (current && current.length >= 16) return current;

    const next = createSessionId();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return createSessionId();
  }
};

const getHostFromReferrer = () => {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
};

const getAttributionPayload = () => {
  if (typeof window === "undefined") {
    return {
      source: "direct",
      path: null,
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const explicitSource = params.get("source") || params.get("origem") || params.get("ref");
  const referrerHost = getHostFromReferrer();
  const source = utmSource || explicitSource || referrerHost || "direct";

  return {
    source,
    path: `${window.location.pathname}${window.location.search}`,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    utm_source: utmSource,
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
};

const normalizeFunnel = (value: unknown): PublicMenuConversionFunnel => {
  if (!isRecord(value)) return EMPTY_FUNNEL;

  const summary = isRecord(value.summary) ? value.summary : {};
  const steps = Array.isArray(value.steps) ? value.steps : [];
  const sources = Array.isArray(value.sources) ? value.sources : [];
  const products = Array.isArray(value.products) ? value.products : [];
  const searches = Array.isArray(value.searches) ? value.searches : [];

  return {
    summary: {
      menuViews: asNumber(summary.menuViews),
      productClicks: asNumber(summary.productClicks),
      addToCart: asNumber(summary.addToCart),
      checkoutStarted: asNumber(summary.checkoutStarted),
      ordersCompleted: asNumber(summary.ordersCompleted),
      searches: asNumber(summary.searches),
      searchesWithoutResults: asNumber(summary.searchesWithoutResults),
      viewToProductRate: asNumber(summary.viewToProductRate),
      productToCartRate: asNumber(summary.productToCartRate),
      cartToCheckoutRate: asNumber(summary.cartToCheckoutRate),
      checkoutToOrderRate: asNumber(summary.checkoutToOrderRate),
      viewToOrderRate: asNumber(summary.viewToOrderRate),
      searchNoResultRate: asNumber(summary.searchNoResultRate),
    },
    steps: steps.filter(isRecord).map((step) => ({
      position: asNumber(step.position),
      eventType: asString(step.eventType, "menu_view") as PublicMenuAnalyticsEventType,
      label: asString(step.label, "Etapa"),
      total: asNumber(step.total),
      rateFromPrevious: asNumber(step.rateFromPrevious),
    })),
    sources: sources.filter(isRecord).map((source) => ({
      source: asString(source.source, "direct"),
      menuViews: asNumber(source.menuViews),
      productClicks: asNumber(source.productClicks),
      addToCart: asNumber(source.addToCart),
      checkoutStarted: asNumber(source.checkoutStarted),
      ordersCompleted: asNumber(source.ordersCompleted),
      revenue: asNumber(source.revenue),
      conversionRate: asNumber(source.conversionRate),
    })),
    products: products.filter(isRecord).map((product) => ({
      productId: asString(product.productId),
      productName: asString(product.productName, "Produto"),
      categoryName: typeof product.categoryName === "string" ? product.categoryName : null,
      productClicks: asNumber(product.productClicks),
      addToCart: asNumber(product.addToCart),
      ordersCompleted: asNumber(product.ordersCompleted),
      soldQuantity: asNumber(product.soldQuantity),
      revenue: asNumber(product.revenue),
      clickToCartRate: asNumber(product.clickToCartRate),
      cartToOrderRate: asNumber(product.cartToOrderRate),
      diagnosticCode: asString(product.diagnosticCode, "healthy") as PublicMenuProductDiagnostic["diagnosticCode"],
    })),
    searches: searches.filter(isRecord).map((search) => ({
      query: asString(search.query),
      searches: asNumber(search.searches),
      noResults: asNumber(search.noResults),
      maxResultCount: asNumber(search.maxResultCount),
      noResultRate: asNumber(search.noResultRate),
    })),
  };
};

export const trackPublicMenuEvent = async ({
  restaurantId,
  eventType,
  productId,
  orderId,
  metadata,
}: TrackPublicMenuEventInput) => {
  if (!restaurantId) return;

  const payload = {
    ...(metadata ?? {}),
    ...getAttributionPayload(),
    ...(productId ? { product_id: productId } : {}),
    ...(orderId ? { order_id: orderId } : {}),
  };

  const { error } = await db.rpc("track_public_menu_event", {
    p_restaurant_id: restaurantId,
    p_session_id: getSessionId(restaurantId),
    p_event_type: eventType,
    p_payload: payload,
  });

  if (error) {
    console.warn("[publicMenuAnalytics] tracking failed", error.message);
  }
};

export const trackPublicMenuEventQuietly = (input: TrackPublicMenuEventInput) => {
  void trackPublicMenuEvent(input).catch((error) => {
    console.warn("[publicMenuAnalytics] tracking failed", error);
  });
};

export const getPublicMenuConversionFunnel = async (
  dateFrom: Date,
  dateTo: Date,
): Promise<PublicMenuConversionFunnel> => {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Restaurante não encontrado.");

  const from = startOfDay(dateFrom);
  const to = endOfDay(dateTo);
  if (from > to) throw new Error("A data inicial não pode ser maior que a data final.");
  assertMaxReportRange(from, to);

  const { data, error } = await db.rpc("get_public_menu_conversion_funnel", {
    p_restaurant_id: restaurantId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) throw new Error(error.message || "Erro ao carregar funil de conversão.");
  return normalizeFunnel(data);
};
