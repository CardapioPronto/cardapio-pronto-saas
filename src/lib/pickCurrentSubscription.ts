import { DISPLAYABLE_SUBSCRIPTION_STATUSES } from "@/lib/subscriptionStatusUi";

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  /** Checkout pago aguardando ativação no Pagar.me — prioridade sobre trial legado. */
  pending: 1,
  trialing: 2,
  past_due: 3,
};

type SubscriptionLike = {
  status: string;
  is_trial?: boolean | null;
  trial_ends_at?: string | null;
};

function isCanceledTrialStillValid(sub: SubscriptionLike, now = Date.now()) {
  if (sub.status !== "canceled" || !sub.is_trial || !sub.trial_ends_at) return false;
  const ends = new Date(sub.trial_ends_at).getTime();
  return Number.isFinite(ends) && ends >= now;
}

/** Escolhe a assinatura “atual” para a UI (paga tem prioridade sobre trial legado). */
export function pickCurrentSubscription<T extends SubscriptionLike>(
  subscriptions: T[],
): T | null {
  const visible = subscriptions.filter((sub) =>
    (DISPLAYABLE_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status),
  );
  if (visible.length) {
    return [...visible].sort(
      (a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99),
    )[0];
  }

  const revivedTrial = subscriptions.find((sub) => isCanceledTrialStillValid(sub));
  return revivedTrial ?? null;
}
