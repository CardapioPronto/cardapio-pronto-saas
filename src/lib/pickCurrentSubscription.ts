import { DISPLAYABLE_SUBSCRIPTION_STATUSES } from "@/lib/subscriptionStatusUi";

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  pending: 1,
  past_due: 2,
  trialing: 3,
};

/** Escolhe a assinatura “atual” para a UI (paga tem prioridade sobre trial legado). */
export function pickCurrentSubscription<T extends { status: string }>(
  subscriptions: T[],
): T | null {
  const visible = subscriptions.filter((sub) =>
    (DISPLAYABLE_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status),
  );
  if (!visible.length) return null;
  return [...visible].sort(
    (a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99),
  )[0];
}
