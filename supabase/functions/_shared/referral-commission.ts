import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendReferralCommissionPendingEmail } from "./referral-notifications.ts";

type PagarmeAmountSource = {
  id?: string | null;
  paid_amount?: number | string | null;
  amount?: number | string | null;
};

export function extractPagarmePaidAmountCents(data: PagarmeAmountSource): number {
  const paid = Number(data.paid_amount ?? data.amount ?? 0);
  if (!Number.isFinite(paid) || paid <= 0) return 0;
  return Math.round(paid);
}

export function buildPagarmeReference(
  type: string,
  data: PagarmeAmountSource,
  fallbackSubscriptionId?: string | null,
): string | null {
  const id = data.id ? String(data.id) : null;
  if (id) return `${type}:${id}`;
  if (fallbackSubscriptionId) return `${type}:sub:${fallbackSubscriptionId}`;
  return null;
}

export async function tryAccrueReferralCommission(
  supabase: SupabaseClient,
  options: {
    localSubscriptionId: string;
    pagarmeReference: string;
    grossAmountCents: number;
    paidAt?: string;
  },
): Promise<void> {
  if (!options.localSubscriptionId || !options.pagarmeReference || options.grossAmountCents <= 0) {
    return;
  }

  const { data, error } = await supabase.rpc("accrue_referral_commission_for_payment", {
    p_subscription_id: options.localSubscriptionId,
    p_pagarme_reference: options.pagarmeReference,
    p_gross_amount_cents: options.grossAmountCents,
    p_restaurant_paid_at: options.paidAt ?? new Date().toISOString(),
  });

  if (error) {
    console.warn("[referral-commission] accrue failed:", error.message);
    return;
  }

  const result = data as {
    accrued?: boolean;
    reason?: string;
    referrer_user_id?: string;
    commission_amount_cents?: number;
  } | null;

  if (result?.accrued === false && result.reason && result.reason !== "duplicate_reference") {
    console.info("[referral-commission] not accrued:", result.reason);
    return;
  }

  if (result?.accrued && result.referrer_user_id && result.commission_amount_cents) {
    const { data: settings } = await supabase
      .from("referral_program_settings")
      .select("hold_days_before_approval")
      .eq("id", "default")
      .maybeSingle();

    await sendReferralCommissionPendingEmail(supabase, {
      referrerUserId: result.referrer_user_id,
      commissionAmountCents: Number(result.commission_amount_cents),
      holdDays: Number(settings?.hold_days_before_approval ?? 30),
    }).catch((err) => {
      console.warn("[referral-commission] pending email failed:", err);
    });
  }
}

export async function tryReverseReferralCommission(
  supabase: SupabaseClient,
  pagarmeReference: string | null,
): Promise<void> {
  if (!pagarmeReference) return;

  const { error } = await supabase.rpc("reverse_referral_commission_for_payment", {
    p_pagarme_reference: pagarmeReference,
  });

  if (error) {
    console.warn("[referral-commission] reverse failed:", error.message);
  }
}
