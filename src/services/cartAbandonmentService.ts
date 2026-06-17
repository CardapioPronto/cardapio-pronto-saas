import { endOfDay, startOfDay, subDays } from "date-fns";
import { supabase, getCurrentRestaurantId } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";
import type { MultiFlavorSelection } from "@/lib/multiFlavor";
import { assertMaxReportRange } from "@/lib/reportLimits";

export type CartAbandonmentSettings = {
  restaurant_id: string;
  enabled: boolean;
  abandonment_minutes: number;
  remind_via_email: boolean;
  remind_via_whatsapp: boolean;
  recovery_coupon_code: string | null;
  reminder_cooldown_days: number;
  recovery_window_hours: number;
};

export type CartAbandonmentMetrics = {
  trackedAbandonments: number;
  reminded: number;
  recovered: number;
  recoveredRevenue: number;
  activeSessions: number;
  recoveryRate: number;
};

export type CartAbandonmentRecentItem = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  status: string;
  cartSubtotal: number;
  itemCount: number;
  reminderChannel: string | null;
  recoveredRevenue: number | null;
  lastActivityAt: string;
  abandonedAt: string | null;
  remindedAt: string | null;
  recoveredAt: string | null;
};

export type CartAbandonmentDashboard = {
  settings: CartAbandonmentSettings;
  metrics: CartAbandonmentMetrics;
  recent: CartAbandonmentRecentItem[];
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown) => Number(value ?? 0);

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const DEFAULT_SETTINGS: CartAbandonmentSettings = {
  restaurant_id: "",
  enabled: false,
  abandonment_minutes: 30,
  remind_via_email: true,
  remind_via_whatsapp: false,
  recovery_coupon_code: null,
  reminder_cooldown_days: 7,
  recovery_window_hours: 72,
};

function normalizeDashboard(value: Json): CartAbandonmentDashboard {
  if (!isRecord(value)) {
    return { settings: DEFAULT_SETTINGS, metrics: emptyMetrics(), recent: [] };
  }

  const settings = isRecord(value.settings) ? value.settings : {};
  const metrics = isRecord(value.metrics) ? value.metrics : {};
  const recent = Array.isArray(value.recent) ? value.recent : [];

  return {
    settings: {
      restaurant_id: String(settings.restaurant_id ?? ""),
      enabled: settings.enabled === true,
      abandonment_minutes: asNumber(settings.abandonment_minutes || 30),
      remind_via_email: settings.remind_via_email !== false,
      remind_via_whatsapp: settings.remind_via_whatsapp === true,
      recovery_coupon_code: asStringOrNull(settings.recovery_coupon_code),
      reminder_cooldown_days: asNumber(settings.reminder_cooldown_days || 7),
      recovery_window_hours: asNumber(settings.recovery_window_hours || 72),
    },
    metrics: {
      trackedAbandonments: asNumber(metrics.trackedAbandonments),
      reminded: asNumber(metrics.reminded),
      recovered: asNumber(metrics.recovered),
      recoveredRevenue: asNumber(metrics.recoveredRevenue),
      activeSessions: asNumber(metrics.activeSessions),
      recoveryRate: asNumber(metrics.recoveryRate),
    },
    recent: (recent.filter(isRecord) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id ?? ""),
      customerName: asStringOrNull(item.customerName),
      customerPhone: String(item.customerPhone ?? ""),
      status: String(item.status ?? ""),
      cartSubtotal: asNumber(item.cartSubtotal),
      itemCount: asNumber(item.itemCount),
      reminderChannel: asStringOrNull(item.reminderChannel),
      recoveredRevenue: item.recoveredRevenue == null ? null : asNumber(item.recoveredRevenue),
      lastActivityAt: String(item.lastActivityAt ?? ""),
      abandonedAt: asStringOrNull(item.abandonedAt),
      remindedAt: asStringOrNull(item.remindedAt),
      recoveredAt: asStringOrNull(item.recoveredAt),
    })),
  };
}

function emptyMetrics(): CartAbandonmentMetrics {
  return {
    trackedAbandonments: 0,
    reminded: 0,
    recovered: 0,
    recoveredRevenue: 0,
    activeSessions: 0,
    recoveryRate: 0,
  };
}

export type UpsertCartSessionInput = {
  restaurantId: string;
  sessionToken: string;
  phone: string;
  customerName?: string;
  customerEmail?: string;
  acceptsEmail?: boolean;
  acceptsWhatsapp?: boolean;
  fulfillmentType?: string;
  items: Array<{ name: string; quantity: number; price: number; flavor_selection?: MultiFlavorSelection }>;
  subtotal: number;
};

export const cartAbandonmentService = {
  async upsertPublicSession(input: UpsertCartSessionInput) {
    const phoneDigits = input.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || input.items.length === 0) return;

    const { error } = await supabase.rpc("upsert_public_cart_abandonment_session", {
      p_restaurant_id: input.restaurantId,
      p_session_token: input.sessionToken,
      p_phone: input.phone,
      p_customer_name: input.customerName?.trim() || null,
      p_customer_email: input.customerEmail?.trim() || null,
      p_accepts_email: input.acceptsEmail ?? false,
      p_accepts_whatsapp: input.acceptsWhatsapp ?? false,
      p_fulfillment_type: input.fulfillmentType || null,
      p_cart_snapshot: {
        subtotal: input.subtotal,
        item_count: input.items.reduce((sum, item) => sum + item.quantity, 0),
        items: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          flavor_selection: item.flavor_selection,
        })),
      },
    });

    if (error) {
      console.warn("[cartAbandonment] upsert failed", error.message);
    }
  },

  async getDashboard(dateFrom = subDays(new Date(), 29), dateTo = new Date()) {
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) throw new Error("Restaurante não encontrado.");

    const from = startOfDay(dateFrom);
    const to = endOfDay(dateTo);
    assertMaxReportRange(from, to);

    const { data, error } = await supabase.rpc("get_cart_abandonment_dashboard", {
      p_restaurant_id: restaurantId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });

    if (error) throw error;
    return normalizeDashboard(data);
  },

  async saveSettings(patch: Partial<CartAbandonmentSettings>) {
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) throw new Error("Restaurante não encontrado.");

    const { data, error } = await supabase.rpc("save_cart_abandonment_settings", {
      p_restaurant_id: restaurantId,
      p_patch: {
        enabled: patch.enabled,
        abandonment_minutes: patch.abandonment_minutes,
        remind_via_email: patch.remind_via_email,
        remind_via_whatsapp: patch.remind_via_whatsapp,
        recovery_coupon_code: patch.recovery_coupon_code,
        reminder_cooldown_days: patch.reminder_cooldown_days,
        recovery_window_hours: patch.recovery_window_hours,
      },
    });

    if (error) throw error;
    return data;
  },
};
