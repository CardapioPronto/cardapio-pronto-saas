import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getCurrentRestaurantId } from "@/lib/supabase";

type JsonRecord = Record<string, unknown>;

export type PublicOrderFeedbackInput = {
  trackingId: string;
  rating: number;
  comment?: string;
  contactRequested?: boolean;
};

export type FeedbackSummary = {
  total: number;
  averageRating: number;
  promoters: number;
  passives: number;
  detractors: number;
  openLowRating: number;
  contactRequests: number;
  nps: number;
};

export type FeedbackRecentItem = {
  id: string;
  orderId: string;
  trackingId: string;
  rating: number;
  comment: string | null;
  contactRequested: boolean;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  resolvedAt: string | null;
  orderTotal: number;
  orderNumber: string | null;
};

export type FeedbackDashboardData = {
  summary: FeedbackSummary;
  recent: FeedbackRecentItem[];
};

const EMPTY_DATA: FeedbackDashboardData = {
  summary: {
    total: 0,
    averageRating: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
    openLowRating: 0,
    contactRequests: 0,
    nps: 0,
  },
  recent: [],
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown) => Number(value ?? 0);

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const normalizeFeedbackDashboard = (value: Json): FeedbackDashboardData => {
  if (!isRecord(value)) return EMPTY_DATA;

  const summary = isRecord(value.summary) ? value.summary : {};
  const recent = Array.isArray(value.recent) ? value.recent : [];

  return {
    summary: {
      total: asNumber(summary.total),
      averageRating: asNumber(summary.averageRating),
      promoters: asNumber(summary.promoters),
      passives: asNumber(summary.passives),
      detractors: asNumber(summary.detractors),
      openLowRating: asNumber(summary.openLowRating),
      contactRequests: asNumber(summary.contactRequests),
      nps: asNumber(summary.nps),
    },
    recent: (recent.filter(isRecord) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id ?? ""),
      orderId: String(item.orderId ?? ""),
      trackingId: String(item.trackingId ?? ""),
      rating: asNumber(item.rating),
      comment: asStringOrNull(item.comment),
      contactRequested: item.contactRequested === true,
      customerName: asStringOrNull(item.customerName),
      customerPhone: asStringOrNull(item.customerPhone),
      createdAt: String(item.createdAt ?? ""),
      resolvedAt: asStringOrNull(item.resolvedAt),
      orderTotal: asNumber(item.orderTotal),
      orderNumber: asStringOrNull(item.orderNumber),
    })),
  };
};

export const orderFeedbackService = {
  async submitPublic(input: PublicOrderFeedbackInput) {
    const { data, error } = await supabase.rpc("submit_public_order_feedback", {
      p_tracking_id: input.trackingId,
      p_rating: input.rating,
      p_comment: input.comment?.trim() || null,
      p_contact_requested: input.contactRequested ?? false,
    });

    if (error) throw error;
    return data;
  },

  async resolveFeedback(feedbackId: string) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user?.id) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from("order_feedback")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: authData.user.id,
      })
      .eq("id", feedbackId);

    if (error) throw error;
  },

  async getDashboard(input: { dateFrom: Date; dateTo: Date }) {
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) throw new Error("Restaurante não encontrado.");

    const { data, error } = await supabase.rpc("get_restaurant_feedback_summary", {
      p_restaurant_id: restaurantId,
      p_from: input.dateFrom.toISOString(),
      p_to: input.dateTo.toISOString(),
    });

    if (error) throw error;
    return normalizeFeedbackDashboard(data);
  },
};
