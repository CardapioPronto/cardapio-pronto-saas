/** Maps Pagar.me subscription.status to Pubfy `subscriptions.status`. */
export function mapPagarmeSubscriptionStatus(
  pagarmeStatus: string | undefined | null,
  options: {
    trialDays?: number;
    paymentMethod?: "credit_card" | "boleto" | "pix";
  } = {},
): string {
  const trialDays = options.trialDays ?? 0;
  const normalized = (pagarmeStatus ?? "").toLowerCase();

  switch (normalized) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "ended":
      return "canceled";
    case "pending":
      return "pending";
    case "failed":
      return "past_due";
    default:
      if (trialDays > 0) return "trialing";
      if (options.paymentMethod === "boleto" || options.paymentMethod === "pix") {
        return "pending";
      }
      return "pending";
  }
}

export const SUBSCRIPTION_STATUSES_TO_SUPERSEDE = [
  "active",
  "trialing",
  "past_due",
  "pending",
] as const;
