/**
 * Regras puras de acesso por assinatura/trial/grace de past_due (espelha o hook useSubscriptionStatus).
 * `now` injetável para testes determinísticos.
 */
export type SubscriptionAccessInput = {
  status: string;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  current_period_end?: string | null;
  next_billing_at?: string | null;
};

export type SubscriptionAccessResult = {
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number;
  renewalEndsAt: Date | null;
  daysUntilRenewal: number;
  showRenewalAlert: boolean;
  graceEndsAt: Date | null;
  daysUntilBlock: number;
  showPastDueGraceAlert: boolean;
};

const RENEWAL_ALERT_DAYS = 7;

/** Dias após `current_period_end` em que `past_due` (ou `active` vencido) ainda tem acesso. */
export const PAST_DUE_GRACE_DAYS = 7;

export function computePastDueGrace(
  input: Pick<SubscriptionAccessInput, "status" | "current_period_end">,
  now: Date = new Date(),
  graceDays: number = PAST_DUE_GRACE_DAYS,
) {
  const periodEnd = input.current_period_end ? new Date(input.current_period_end) : null;
  if (!periodEnd || Number.isNaN(periodEnd.getTime())) {
    return {
      graceEndsAt: null as Date | null,
      isInGrace: false,
      daysUntilBlock: 0,
      showPastDueGraceAlert: false,
    };
  }

  const graceEndsAt = new Date(periodEnd.getTime() + graceDays * 86400000);
  const periodExpired = periodEnd.getTime() < now.getTime();
  const graceApplies =
    input.status === "past_due" || (input.status === "active" && periodExpired);
  const isInGrace = graceApplies && now.getTime() < graceEndsAt.getTime();
  const daysUntilBlock = isInGrace
    ? Math.max(0, Math.ceil((graceEndsAt.getTime() - now.getTime()) / 86400000))
    : 0;
  const showPastDueGraceAlert =
    isInGrace && (input.status === "past_due" || periodExpired);

  return { graceEndsAt, isInGrace, daysUntilBlock, showPastDueGraceAlert };
}

export function computeRenewalAlert(
  input: Pick<
    SubscriptionAccessInput,
    "status" | "is_trial" | "current_period_end" | "next_billing_at"
  >,
  now: Date = new Date(),
  withinDays: number = RENEWAL_ALERT_DAYS,
) {
  if (input.status !== "active" || input.is_trial) {
    return { renewalEndsAt: null, daysUntilRenewal: 0, showRenewalAlert: false };
  }
  const raw = input.next_billing_at ?? input.current_period_end;
  if (!raw) {
    return { renewalEndsAt: null, daysUntilRenewal: 0, showRenewalAlert: false };
  }
  const renewalEndsAt = new Date(raw);
  if (Number.isNaN(renewalEndsAt.getTime())) {
    return { renewalEndsAt: null, daysUntilRenewal: 0, showRenewalAlert: false };
  }
  const daysUntilRenewal = Math.ceil(
    (renewalEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return {
    renewalEndsAt,
    daysUntilRenewal: Math.max(0, daysUntilRenewal),
    showRenewalAlert: daysUntilRenewal > 0 && daysUntilRenewal <= withinDays,
  };
}

export function computeSubscriptionAccess(
  input: SubscriptionAccessInput,
  now: Date = new Date(),
): SubscriptionAccessResult {
  const isInTrial =
    input.status === "trialing" ||
    (Boolean(input.is_trial) &&
      input.status !== "active" &&
      input.status !== "canceled");
  const trialEndsAt = input.trial_ends_at ? new Date(input.trial_ends_at) : null;
  const daysLeftInTrial = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const trialIsActive = isInTrial && (!trialEndsAt || trialEndsAt.getTime() >= now.getTime());
  const periodEnd = input.current_period_end ? new Date(input.current_period_end) : null;
  const paidPeriodValid =
    input.status === "active" &&
    (!periodEnd || Number.isNaN(periodEnd.getTime()) || periodEnd.getTime() >= now.getTime());
  const grace = computePastDueGrace(input, now);

  const renewal = computeRenewalAlert(input, now);

  return {
    hasActiveSubscription: paidPeriodValid || trialIsActive || grace.isInGrace,
    isInTrial,
    trialEndsAt,
    daysLeftInTrial: Math.max(0, daysLeftInTrial),
    ...renewal,
    graceEndsAt: grace.graceEndsAt,
    daysUntilBlock: grace.daysUntilBlock,
    showPastDueGraceAlert: grace.showPastDueGraceAlert,
  };
}
