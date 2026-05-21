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
      return trialDays > 0 ? "trialing" : "pending";
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
    case "future":
    case "scheduled":
      return trialDays > 0 ? "trialing" : "pending";
    case "failed":
      return "canceled";
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

export const SUBSCRIPTION_ENTITLEMENT_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;

type SupabaseAdmin = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        in: (col: string, vals: readonly string[]) => {
          neq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };
};

/** Cancela assinaturas anteriores somente após a nova estar persistida com sucesso. */
export async function supersedePriorSubscriptions(
  admin: SupabaseAdmin,
  restaurantId: string,
  keepSubscriptionId: string,
) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "canceled", end_date: now })
    .eq("restaurant_id", restaurantId)
    .in("status", [...SUBSCRIPTION_STATUSES_TO_SUPERSEDE])
    .neq("id", keepSubscriptionId);

  if (error) {
    throw new Error(`Failed to supersede prior subscriptions: ${error.message}`);
  }
}
