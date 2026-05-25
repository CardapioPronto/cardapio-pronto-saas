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
  trial_start?: string | null;
  current_period_start?: string | null;
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

export function entitlementEndsAt(prior: PriorEntitlement | null | undefined): Date | null {
  if (!prior) return null;

  const raw = (prior.status === "trialing" || prior.is_trial)
    ? prior.trial_ends_at
    : prior.status === "active" || prior.status === "past_due"
      ? prior.current_period_end
      : null;
  if (!raw) return null;

  const end = new Date(raw);
  return Number.isNaN(end.getTime()) ? null : end;
}

function entitlementStartsAt(prior: PriorEntitlement | null | undefined): Date | null {
  if (!prior) return null;

  const raw = (prior.status === "trialing" || prior.is_trial)
    ? prior.trial_start ?? prior.current_period_start
    : prior.status === "active" || prior.status === "past_due" || prior.status === "pending"
      ? prior.current_period_start
      : null;
  if (!raw) return null;

  const start = new Date(raw);
  return Number.isNaN(start.getTime()) ? null : start;
}

/**
 * Evita período invertido quando o Pagar.me agenda start_at após o fim do trial local
 * (ex.: plano remoto com trial_period_days > 0).
 */
export function resolveCheckoutPeriodStart(
  now: Date,
  pagarme: PagarmeSubscriptionPayload,
  priorEntitlement?: PriorEntitlement | null,
  options?: { localStatus?: string },
): Date {
  const priorEnd = entitlementEndsAt(priorEntitlement);
  const priorStart = entitlementStartsAt(priorEntitlement);
  const remoteStart = pagarme.start_at
    ? new Date(pagarme.start_at)
    : pagarme.current_period_start
      ? new Date(pagarme.current_period_start)
      : null;

  if (options?.localStatus === "pending" && priorEnd) {
    return priorStart && priorStart.getTime() <= now.getTime() ? priorStart : now;
  }

  if (remoteStart && !Number.isNaN(remoteStart.getTime())) {
    if (priorEnd && remoteStart.getTime() > priorEnd.getTime()) {
      return now;
    }
    if (remoteStart.getTime() > now.getTime() + 60_000) {
      return now;
    }
    return remoteStart;
  }

  if (priorStart && priorStart.getTime() <= now.getTime()) return priorStart;
  return now;
}

function ensurePeriodEndNotBeforeStart(periodStart: Date, periodEnd: Date): Date {
  return periodEnd.getTime() < periodStart.getTime() ? new Date(periodStart) : periodEnd;
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

  const status = mapPagarmeSubscriptionStatus(input.pagarme.status, {
    trialDays,
    paymentMethod: input.paymentMethod,
  });

  const periodStart = resolveCheckoutPeriodStart(now, input.pagarme, input.priorEntitlement, {
    localStatus: status,
  });

  const { periodEnd, nextBilling } = resolvePaidSubscriptionPeriod({
    billingCycle: input.billingCycle,
    periodStart,
    pagarmePeriodEnd: input.pagarme.current_period_end,
    pagarmeNextBilling: input.pagarme.next_billing_at,
    remainingCreditMs,
  });
  const periodCreditDays = remainingCreditDays(remainingCreditMs);
  const safePeriodEnd = ensurePeriodEndNotBeforeStart(periodStart, periodEnd);
  const safeNextBilling = ensurePeriodEndNotBeforeStart(periodStart, nextBilling);

  return {
    status,
    is_trial: false,
    trial_start: null as string | null,
    trial_ends_at: null as string | null,
    billing_cycle: input.billingCycle,
    start_date: periodStart.toISOString(),
    current_period_start: periodStart.toISOString(),
    current_period_end: safePeriodEnd.toISOString(),
    next_billing_at: safeNextBilling.toISOString(),
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

/**
 * Pending boleto/PIX does not grant a paid cycle yet. Keep only the previous
 * entitlement end as carry-over so a later paid event can credit remaining time.
 */
export function pendingSubscriptionInsertRow(
  localSub: ReturnType<typeof buildLocalSubscriptionFromPagarme>,
  priorEntitlement?: PriorEntitlement | null,
) {
  const row = subscriptionInsertRow(localSub);
  if (row.status !== "pending") return row;

  const carryUntil = entitlementEndsAt(priorEntitlement);
  const carryStart = entitlementStartsAt(priorEntitlement) ??
    (row.current_period_start ? new Date(row.current_period_start) : new Date());

  if (!carryUntil) {
    return row;
  }

  const periodStart = carryStart.getTime() <= carryUntil.getTime()
    ? carryStart
    : carryUntil;

  return {
    ...row,
    start_date: periodStart.toISOString(),
    current_period_start: periodStart.toISOString(),
    current_period_end: carryUntil.toISOString(),
    next_billing_at: carryUntil.toISOString(),
  };
}

/** Início da assinatura no Pagar.me: após trial/período vigente, ou imediato (omitido). */
export function pagarmeSubscriptionStartAt(
  now: Date,
  prior?: PriorEntitlement | null,
): string | undefined {
  const end = entitlementEndsAt(prior);
  if (!end || end.getTime() <= now.getTime() + 60_000) return undefined;
  return end.toISOString();
}

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Detecta plano remoto contaminado por trial no Pagar.me.
 * Quando enviamos `start_at` para o fim do trial local, a API deve respeitar
 * essa data; quando omitimos, a assinatura deve iniciar imediatamente. Se ela
 * volta muitos dias no futuro, o plano remoto ainda carrega trial próprio.
 */
export function remoteStartAtExceedsExpected(input: {
  remoteStartAt?: string | null;
  expectedStartAt?: string | null;
  now?: Date;
  toleranceMs?: number;
}): boolean {
  const remoteStart = parseDateOrNull(input.remoteStartAt);
  if (!remoteStart) return false;

  const expectedStart = parseDateOrNull(input.expectedStartAt) ?? input.now ?? new Date();
  const toleranceMs = input.toleranceMs ?? 2 * 86400000;
  return remoteStart.getTime() > expectedStart.getTime() + toleranceMs;
}
