import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type OnlinePaymentMethod = "pix" | "credit_card";
export type PaymentFulfillment = "delivery" | "pickup" | "table" | "counter";

export interface RestaurantPaymentSettings {
  id?: string;
  restaurant_id: string;
  provider: "pagarme";
  marketplace_mode: "split" | "direct";
  is_enabled: boolean;
  onboarding_status: "not_started" | "pending" | "approved" | "rejected";
  recipient_id: string | null;
  enabled_methods: OnlinePaymentMethod[];
  allow_delivery: boolean;
  allow_pickup: boolean;
  allow_table: boolean;
  allow_counter: boolean;
  commission_type: "none" | "percentage" | "flat";
  commission_value: number;
  notes: string | null;
  metadata?: Record<string, unknown>;
}

export interface PublicRestaurantPaymentSettings {
  enabled: boolean;
  methods: OnlinePaymentMethod[];
  allowedFulfillment: PaymentFulfillment[];
  onboardingStatus: RestaurantPaymentSettings["onboarding_status"];
}

type RestaurantPaymentSettingsRow = Database["public"]["Tables"]["restaurant_payment_settings"]["Row"];
type RestaurantPaymentSettingsInsert = Database["public"]["Tables"]["restaurant_payment_settings"]["Insert"];

const DEFAULT_SETTINGS = (restaurantId: string): RestaurantPaymentSettings => ({
  restaurant_id: restaurantId,
  provider: "pagarme",
  marketplace_mode: "split",
  is_enabled: false,
  onboarding_status: "not_started",
  recipient_id: null,
  enabled_methods: ["pix"],
  allow_delivery: true,
  allow_pickup: true,
  allow_table: false,
  allow_counter: false,
  commission_type: "none",
  commission_value: 0,
  notes: null,
  metadata: {},
});

const PAYMENT_METHODS = new Set<OnlinePaymentMethod>(["pix", "credit_card"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMethods(methods?: string[] | null): OnlinePaymentMethod[] {
  const validMethods = (methods || []).filter((method): method is OnlinePaymentMethod =>
    PAYMENT_METHODS.has(method as OnlinePaymentMethod),
  );
  return validMethods.length ? validMethods : ["pix"];
}

function normalize(row: Partial<RestaurantPaymentSettingsRow>, restaurantId: string): RestaurantPaymentSettings {
  return {
    ...DEFAULT_SETTINGS(restaurantId),
    id: row.id,
    restaurant_id: row.restaurant_id || restaurantId,
    provider: "pagarme",
    marketplace_mode: row.marketplace_mode === "direct" ? "direct" : "split",
    is_enabled: Boolean(row.is_enabled),
    onboarding_status: ["pending", "approved", "rejected"].includes(String(row.onboarding_status))
      ? row.onboarding_status as RestaurantPaymentSettings["onboarding_status"]
      : "not_started",
    recipient_id: row.recipient_id ?? null,
    enabled_methods: normalizeMethods(row.enabled_methods),
    allow_delivery: row.allow_delivery ?? true,
    allow_pickup: row.allow_pickup ?? true,
    allow_table: row.allow_table ?? false,
    allow_counter: row.allow_counter ?? false,
    commission_type: ["percentage", "flat"].includes(String(row.commission_type))
      ? row.commission_type as RestaurantPaymentSettings["commission_type"]
      : "none",
    commission_value: Number(row.commission_value || 0),
    notes: row.notes ?? null,
    metadata: isRecord(row.metadata) ? row.metadata : {},
  };
}

export const restaurantPaymentService = {
  async getSettings(restaurantId: string): Promise<RestaurantPaymentSettings> {
    const { data, error } = await supabase
      .from("restaurant_payment_settings")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (error) throw error;
    return normalize(data || {}, restaurantId);
  },

  async saveSettings(settings: RestaurantPaymentSettings): Promise<RestaurantPaymentSettings> {
    const payload: RestaurantPaymentSettingsInsert = {
      restaurant_id: settings.restaurant_id,
      provider: "pagarme",
      marketplace_mode: settings.marketplace_mode,
      is_enabled: settings.is_enabled,
      onboarding_status: settings.onboarding_status,
      recipient_id: settings.recipient_id?.trim() || null,
      enabled_methods: settings.enabled_methods.length ? settings.enabled_methods : ["pix"],
      allow_delivery: settings.allow_delivery,
      allow_pickup: settings.allow_pickup,
      allow_table: settings.allow_table,
      allow_counter: settings.allow_counter,
      commission_type: settings.commission_type,
      commission_value: Number(settings.commission_value || 0),
      notes: settings.notes?.trim() || null,
      metadata: (settings.metadata || {}) as Json,
    };

    const { data, error } = await supabase
      .from("restaurant_payment_settings")
      .upsert(payload, { onConflict: "restaurant_id" })
      .select("*")
      .single();

    if (error) throw error;
    return normalize(data, settings.restaurant_id);
  },

  toPublic(settings?: RestaurantPaymentSettings | null): PublicRestaurantPaymentSettings {
    if (!settings || !settings.is_enabled || settings.onboarding_status !== "approved") {
      return {
        enabled: false,
        methods: [],
        allowedFulfillment: [],
        onboardingStatus: settings?.onboarding_status || "not_started",
      };
    }

    const allowedFulfillment: PaymentFulfillment[] = [];
    if (settings.allow_delivery) allowedFulfillment.push("delivery");
    if (settings.allow_pickup) allowedFulfillment.push("pickup");
    if (settings.allow_table) allowedFulfillment.push("table");
    if (settings.allow_counter) allowedFulfillment.push("counter");

    return {
      enabled: true,
      methods: settings.enabled_methods,
      allowedFulfillment,
      onboardingStatus: settings.onboarding_status,
    };
  },
};
