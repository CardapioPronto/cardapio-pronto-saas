import { supabase, getCurrentRestaurantId } from "@/lib/supabase";

export type CopilotPriority = "high" | "medium" | "low" | string;

export type OwnerCopilotRecommendation = {
  id: string;
  type: "sales" | "menu" | "campaign" | "operation" | "growth" | string;
  priority: CopilotPriority;
  title: string;
  summary: string;
  actionLabel: string;
  actionHref: string;
  why: string[];
  data: Record<string, unknown>;
  guardrail: string;
};

export type OwnerCopilotSummary = {
  todayOrders: number;
  todayRevenue: number;
  openOrders: number;
  last7Orders: number;
  last7Revenue: number;
  previous7Orders: number;
  previous7Revenue: number;
  salesChangePercent: number;
  inactiveCustomers: number;
  activeProducts: number;
};

export type OwnerCopilotInsights = {
  generatedAt: string;
  referenceDate: string;
  summary: OwnerCopilotSummary;
  recommendations: OwnerCopilotRecommendation[];
  disclaimer: string;
};

export type CopilotRecommendationState = {
  status: "reviewed" | "dismissed" | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type OwnerCopilotDailySummary = {
  id: string;
  restaurantId: string;
  summaryDate: string;
  insights: OwnerCopilotInsights;
  recommendationStates: Record<string, CopilotRecommendationState>;
  generatedAt: string;
  updatedAt: string;
};

export type OwnerCopilotAlert = {
  id: string;
  title: string;
  description: string;
  priority: CopilotPriority;
  type: string;
  actionHref: string;
  summaryDate: string;
};

export type OwnerCopilotAlerts = {
  summaryDate: string;
  generatedAt: string;
  alerts: OwnerCopilotAlert[];
  unreadCount: number;
};

const emptySummary: OwnerCopilotSummary = {
  todayOrders: 0,
  todayRevenue: 0,
  openOrders: 0,
  last7Orders: 0,
  last7Revenue: 0,
  previous7Orders: 0,
  previous7Revenue: 0,
  salesChangePercent: 0,
  inactiveCustomers: 0,
  activeProducts: 0,
};

const normalizeInsights = (value: unknown): OwnerCopilotInsights => {
  const data = (value ?? {}) as Partial<OwnerCopilotInsights>;
  const summary = (data.summary ?? {}) as Partial<OwnerCopilotSummary>;

  return {
    generatedAt: String(data.generatedAt ?? new Date().toISOString()),
    referenceDate: String(data.referenceDate ?? new Date().toISOString().slice(0, 10)),
    summary: {
      todayOrders: Number(summary.todayOrders ?? 0),
      todayRevenue: Number(summary.todayRevenue ?? 0),
      openOrders: Number(summary.openOrders ?? 0),
      last7Orders: Number(summary.last7Orders ?? 0),
      last7Revenue: Number(summary.last7Revenue ?? 0),
      previous7Orders: Number(summary.previous7Orders ?? 0),
      previous7Revenue: Number(summary.previous7Revenue ?? 0),
      salesChangePercent: Number(summary.salesChangePercent ?? 0),
      inactiveCustomers: Number(summary.inactiveCustomers ?? 0),
      activeProducts: Number(summary.activeProducts ?? 0),
    },
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    disclaimer: String(data.disclaimer ?? "Nenhuma ação é executada automaticamente."),
  };
};

const normalizeDailySummary = (value: unknown): OwnerCopilotDailySummary => {
  const data = (value ?? {}) as Partial<OwnerCopilotDailySummary>;

  return {
    id: String(data.id ?? ""),
    restaurantId: String(data.restaurantId ?? ""),
    summaryDate: String(data.summaryDate ?? new Date().toISOString().slice(0, 10)),
    insights: normalizeInsights(data.insights),
    recommendationStates:
      data.recommendationStates && typeof data.recommendationStates === "object" && !Array.isArray(data.recommendationStates)
        ? data.recommendationStates as Record<string, CopilotRecommendationState>
        : {},
    generatedAt: String(data.generatedAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
};

const normalizeAlerts = (value: unknown): OwnerCopilotAlerts => {
  const data = (value ?? {}) as Partial<OwnerCopilotAlerts>;
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];

  return {
    summaryDate: String(data.summaryDate ?? new Date().toISOString().slice(0, 10)),
    generatedAt: String(data.generatedAt ?? new Date().toISOString()),
    alerts: alerts.map((alert) => {
      const item = alert as Partial<OwnerCopilotAlert>;
      return {
        id: String(item.id ?? ""),
        title: String(item.title ?? "Recomendação do Copiloto"),
        description: String(item.description ?? "Existe uma sugestão operacional aguardando revisão."),
        priority: String(item.priority ?? "low"),
        type: String(item.type ?? "operation"),
        actionHref: String(item.actionHref ?? "/copiloto"),
        summaryDate: String(item.summaryDate ?? data.summaryDate ?? new Date().toISOString().slice(0, 10)),
      };
    }),
    unreadCount: Number(data.unreadCount ?? alerts.length),
  };
};

async function requireRestaurantId() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    throw new Error("Restaurante não encontrado.");
  }
  return restaurantId;
}

export async function getOwnerCopilotInsights(referenceDate?: Date): Promise<OwnerCopilotInsights> {
  const restaurantId = await requireRestaurantId();

  const { data, error } = await supabase.rpc("get_owner_copilot_insights", {
    p_restaurant_id: restaurantId,
    p_reference_date: referenceDate?.toISOString().slice(0, 10) ?? null,
  });

  if (error) throw error;
  return normalizeInsights(data);
}

export async function refreshOwnerCopilotDailySummary(referenceDate?: Date): Promise<OwnerCopilotDailySummary> {
  const restaurantId = await requireRestaurantId();

  const { data, error } = await supabase.rpc("refresh_owner_copilot_daily_summary", {
    p_restaurant_id: restaurantId,
    p_reference_date: referenceDate?.toISOString().slice(0, 10) ?? null,
  });

  if (error) throw error;
  return normalizeDailySummary(data);
}

export async function getOwnerCopilotAlerts(referenceDate?: Date): Promise<OwnerCopilotAlerts> {
  const restaurantId = await requireRestaurantId();

  const { data, error } = await supabase.rpc("get_owner_copilot_alerts", {
    p_restaurant_id: restaurantId,
    p_reference_date: referenceDate?.toISOString().slice(0, 10) ?? null,
  });

  if (error) throw error;
  return normalizeAlerts(data);
}

export async function listOwnerCopilotDailySummaries(limit = 7): Promise<OwnerCopilotDailySummary[]> {
  const restaurantId = await requireRestaurantId();

  const { data, error } = await supabase.rpc("get_owner_copilot_daily_summaries", {
    p_restaurant_id: restaurantId,
    p_limit: limit,
  });

  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeDailySummary) : [];
}

export async function markOwnerCopilotRecommendation(params: {
  summaryDate: string;
  recommendationId: string;
  status: "reviewed" | "dismissed";
}): Promise<OwnerCopilotDailySummary> {
  const restaurantId = await requireRestaurantId();

  const { data, error } = await supabase.rpc("mark_owner_copilot_recommendation", {
    p_restaurant_id: restaurantId,
    p_summary_date: params.summaryDate,
    p_recommendation_id: params.recommendationId,
    p_status: params.status,
  });

  if (error) throw error;
  return normalizeDailySummary(data);
}
