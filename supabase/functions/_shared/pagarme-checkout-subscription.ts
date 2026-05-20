import { mapPagarmeSubscriptionStatus } from "./pagarme-subscription-status.ts";

export type BillingCycle = "monthly" | "yearly";

export type PagarmeSubscriptionPayload = {
  id?: string;
  status?: string;
  start_at?: string | null;
  next_billing_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
};

/** Trial gratuito é só local (create-trial). Checkout pago não repete trial no Pagar.me. */
export function effectiveTrialDaysForCheckout(_planTrialDays: number | null | undefined): number {
  return 0;
}

export type PriorEntitlement = {
  status: string;
  is_trial?: boolean | null;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
};

/** Dias restantes do trial ou do período pago vigente, creditados no primeiro ciclo após o checkout. */
export function computeRemainingCreditMs(
  now: Date,
  prior: PriorEntitlement | null | undefined,
): number {
  if (!prior) return 0;

  let creditUntil: Date | null = null;

  if (prior.status === "trialing" || prior.is_trial) {
    creditUntil = prior.trial_ends_at ? new Date(prior.trial_ends_at) : null;
  } else if (
    prior.status === "active" ||
    prior.status === "past_due" ||
    prior.status === "pending"
  ) {
    creditUntil = prior.current_period_end ? new Date(prior.current_period_end) : null;
  }

  if (!creditUntil || Number.isNaN(creditUntil.getTime())) return 0;
  return Math.max(0, creditUntil.getTime() - now.getTime());
}

export function remainingCreditDays(creditMs: number): number {
  if (creditMs <= 0) return 0;
  return Math.ceil(creditMs / 86400000);
}

export function periodEndFromBillingCycle(start: Date, cycle: BillingCycle): Date {
  const end = new Date(start);
  if (cycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/** Evita usar fim de período curto do Pagar.me (ex. 14 dias de trial legado no plano). */
export function resolvePaidSubscriptionPeriod(input: {
  billingCycle: BillingCycle;
  periodStart: Date;
  pagarmePeriodEnd?: string | null;
  pagarmeNextBilling?: string | null;
  /** Soma dias restantes (trial ou renovação antecipada) ao ciclo pago. */
  remainingCreditMs?: number;
}) {
  const creditMs = Math.max(0, input.remainingCreditMs ?? 0);
  let localEnd = periodEndFromBillingCycle(input.periodStart, input.billingCycle);
  if (creditMs > 0) {
    localEnd = new Date(localEnd.getTime() + creditMs);
  }

  const pagarmeEnd = input.pagarmePeriodEnd
    ? new Date(input.pagarmePeriodEnd)
    : null;

  const periodEnd =
    pagarmeEnd &&
      !Number.isNaN(pagarmeEnd.getTime()) &&
      pagarmeEnd.getTime() >= localEnd.getTime()
      ? pagarmeEnd
      : localEnd;

  let nextBilling = input.pagarmeNextBilling
    ? new Date(input.pagarmeNextBilling)
    : new Date(periodEnd);

  if (Number.isNaN(nextBilling.getTime()) || nextBilling.getTime() < periodEnd.getTime()) {
    nextBilling = new Date(periodEnd);
  }

  return { periodEnd, nextBilling, creditedMs: creditMs };
}

export function buildLocalSubscriptionFromPagarme(input: {
  pagarme: PagarmeSubscriptionPayload;
  billingCycle: BillingCycle;
  paymentMethod: "credit_card" | "boleto" | "pix";
  planTrialDays?: number | null;
  priorEntitlement?: PriorEntitlement | null;
}) {
  const now = new Date();
  const trialDays = effectiveTrialDaysForCheckout(input.planTrialDays);
  const remainingCreditMs = computeRemainingCreditMs(now, input.priorEntitlement);

  const periodStart = input.pagarme.start_at
    ? new Date(input.pagarme.start_at)
    : input.pagarme.current_period_start
      ? new Date(input.pagarme.current_period_start)
      : now;

  const { periodEnd, nextBilling } = resolvePaidSubscriptionPeriod({
    billingCycle: input.billingCycle,
    periodStart,
    pagarmePeriodEnd: input.pagarme.current_period_end,
    pagarmeNextBilling: input.pagarme.next_billing_at,
    remainingCreditMs,
  });
  const periodCreditDays = remainingCreditDays(remainingCreditMs);

  const status = mapPagarmeSubscriptionStatus(input.pagarme.status, {
    trialDays,
    paymentMethod: input.paymentMethod,
  });

  return {
    status,
    is_trial: false,
    trial_start: null as string | null,
    trial_ends_at: null as string | null,
    billing_cycle: input.billingCycle,
    start_date: periodStart.toISOString(),
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    next_billing_at: nextBilling.toISOString(),
    period_credit_days: periodCreditDays,
  };
}

/** Campos persistíveis em `subscriptions` (sem metadados só de resposta da API). */
export function subscriptionInsertRow(
  localSub: ReturnType<typeof buildLocalSubscriptionFromPagarme>,
) {
  const { period_credit_days: _credit, ...row } = localSub;
  return row;
}
