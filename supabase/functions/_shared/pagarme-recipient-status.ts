import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const VALID_RECIPIENT_STATUSES = new Set([
  "not_created", "registration", "affiliation", "active",
  "refused", "suspended", "blocked", "inactive", "unknown",
]);

export type RecipientStatusValue =
  | "not_created"
  | "registration"
  | "affiliation"
  | "active"
  | "refused"
  | "suspended"
  | "blocked"
  | "inactive"
  | "unknown";

export type PagarmeRecipientSnapshot = {
  id?: string | null;
  status?: string | null;
  kyc_details?: { status?: string | null; status_reason?: string | null } | null;
  metadata?: { restaurant_id?: string | null; source?: string | null } | null;
};

export function normalizeRecipientStatus(status?: string | null): RecipientStatusValue {
  const value = String(status || "").toLowerCase();
  return VALID_RECIPIENT_STATUSES.has(value) ? value as RecipientStatusValue : "unknown";
}

export function onboardingStatusForRecipient(status: RecipientStatusValue): string {
  if (status === "active") return "approved";
  if (status === "refused" || status === "blocked" || status === "suspended") return "rejected";
  if (status === "registration" || status === "affiliation") return "pending";
  return "not_started";
}

export async function resolveRestaurantForRecipient(
  admin: SupabaseClient,
  recipientId: string,
  metadata?: { restaurant_id?: string | null } | null,
): Promise<{ restaurant_id: string; previous_status: string } | null> {
  const { data: account } = await admin
    .from("restaurant_recipient_accounts")
    .select("restaurant_id, recipient_status")
    .eq("recipient_id", recipientId)
    .maybeSingle();

  if (account?.restaurant_id) {
    return {
      restaurant_id: account.restaurant_id,
      previous_status: account.recipient_status || "unknown",
    };
  }

  const restaurantId = metadata?.restaurant_id;
  if (!restaurantId) return null;

  const { data: byRestaurant } = await admin
    .from("restaurant_recipient_accounts")
    .select("restaurant_id, recipient_status")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!byRestaurant?.restaurant_id) return null;

  return {
    restaurant_id: byRestaurant.restaurant_id,
    previous_status: byRestaurant.recipient_status || "unknown",
  };
}

export async function applyRecipientStatusToRestaurant(
  admin: SupabaseClient,
  restaurantId: string,
  recipient: PagarmeRecipientSnapshot,
  rawResponse?: Record<string, unknown>,
): Promise<{ recipient_status: RecipientStatusValue; kyc_status: string | null; onboarding_status: string }> {
  const status = normalizeRecipientStatus(recipient.status);
  const kyc = recipient.kyc_details?.status ?? null;
  const nowIso = new Date().toISOString();
  const onboarding = onboardingStatusForRecipient(status);

  const accountPatch: Record<string, unknown> = {
    recipient_id: recipient.id ?? undefined,
    recipient_status: status,
    kyc_status: kyc,
    synced_at: nowIso,
    last_error: null,
  };
  if (rawResponse) accountPatch.last_response = rawResponse;

  await admin
    .from("restaurant_recipient_accounts")
    .update(accountPatch)
    .eq("restaurant_id", restaurantId);

  const settingsPatch: Record<string, unknown> = {
    recipient_status: status,
    recipient_synced_at: nowIso,
    onboarding_status: onboarding,
  };
  if (recipient.id) settingsPatch.recipient_id = recipient.id;

  const { data: settings } = await admin
    .from("restaurant_payment_settings")
    .select("restaurant_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (settings) {
    await admin.from("restaurant_payment_settings").update(settingsPatch).eq("restaurant_id", restaurantId);
  } else if (recipient.id) {
    await admin.from("restaurant_payment_settings").insert({
      restaurant_id: restaurantId,
      provider: "pagarme",
      is_enabled: false,
      enabled_methods: ["pix"],
      marketplace_mode: "split",
      ...settingsPatch,
    });
  }

  return { recipient_status: status, kyc_status: kyc, onboarding_status: onboarding };
}
