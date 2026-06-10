export const REFERRAL_EMAIL_TEMPLATE_KEYS = [
  "referral_commission_pending",
  "referral_commissions_approved",
  "referral_payout_paid",
] as const;

export type ReferralEmailTemplateKey = (typeof REFERRAL_EMAIL_TEMPLATE_KEYS)[number];

export function referralRecipientNameVariable(displayName: string | null | undefined) {
  const trimmed = displayName?.trim();
  return trimmed ? ` ${trimmed}` : "";
}
