/**
 * Regras puras de acesso por assinatura/trial/grace de past_due (espelha o hook useSubscriptionStatus).
 * `now` injetável para testes determinísticos.
 */
export type SubscriptionAccessInput = {
  status: string;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  current_period_end?: string | null;
};

export type SubscriptionAccessResult = {
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number;
};

export function computeSubscriptionAccess(
  input: SubscriptionAccessInput,
  now: Date = new Date(),
): SubscriptionAccessResult {
  const isInTrial = input.status === "trialing" || Boolean(input.is_trial);
  const trialEndsAt = input.trial_ends_at ? new Date(input.trial_ends_at) : null;
  const daysLeftInTrial = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const currentPeriodEnd = input.current_period_end ? new Date(input.current_period_end) : null;
  const trialIsActive = isInTrial && (!trialEndsAt || trialEndsAt.getTime() >= now.getTime());
  const paidIsActive = input.status === "active";
  const pastDueIsInGrace =
    input.status === "past_due" &&
    !!currentPeriodEnd &&
    currentPeriodEnd.getTime() >= now.getTime();

  return {
    hasActiveSubscription: paidIsActive || trialIsActive || pastDueIsInGrace,
    isInTrial,
    trialEndsAt,
    daysLeftInTrial: Math.max(0, daysLeftInTrial),
  };
}
