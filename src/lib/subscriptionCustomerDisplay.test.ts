import { describe, expect, it } from "vitest";
import {
  findScheduledPaidPlan,
  getCustomerSubscriptionDisplay,
  getSubscriptionCancelCopy,
  getVisibleSubscriptionsForCustomer,
  isTrialCurrentlyActive,
  scheduledPaidGraceEndsAt,
  isScheduledPaidHandoffInGrace,
  isScheduledPaidAfterTrial,
  pickPrimarySubscriptionForDisplay,
} from "./subscriptionCustomerDisplay";

const trial = {
  id: "trial-1",
  status: "trialing",
  is_trial: true,
  trial_ends_at: "2026-06-04T00:00:00Z",
  trial_start: "2026-05-21T00:00:00Z",
  current_period_start: "2026-05-21T00:00:00Z",
  current_period_end: "2026-06-04T00:00:00Z",
  next_billing_at: null,
  has_pagarme_subscription: false,
  pagarme_subscription_id: null,
  last_payment_status: null,
};

const scheduled = {
  id: "pending-1",
  status: "pending",
  is_trial: false,
  trial_ends_at: null,
  trial_start: null,
  current_period_start: "2026-05-21T00:00:00Z",
  current_period_end: "2026-06-04T00:00:00Z",
  next_billing_at: "2026-06-04T00:00:00Z",
  has_pagarme_subscription: true,
  pagarme_subscription_id: "sub_abc",
  last_payment_status: "future",
};

describe("subscriptionCustomerDisplay", () => {
  it("detecta plano pago agendado após trial", () => {
    expect(isScheduledPaidAfterTrial(scheduled)).toBe(true);
    expect(isScheduledPaidAfterTrial(trial)).toBe(false);
  });

  it("oculta card duplicado de trial quando há plano agendado", () => {
    const visible = getVisibleSubscriptionsForCustomer([trial, scheduled]);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("pending-1");
  });

  it("overview prioriza trial quando plano está agendado", () => {
    const primary = pickPrimarySubscriptionForDisplay(
      [trial, scheduled],
      new Date("2026-05-25T00:00:00Z"),
    );
    expect(primary?.id).toBe("trial-1");
  });

  it("overview usa plano agendado quando trial já terminou", () => {
    const expiredTrial = {
      ...trial,
      id: "trial-expired",
      trial_ends_at: "2026-05-23T00:00:00Z",
      current_period_end: "2026-05-23T00:00:00Z",
    };
    const scheduledAfterExpiredTrial = {
      ...scheduled,
      current_period_start: "2026-05-09T00:00:00Z",
      current_period_end: "2026-05-23T00:00:00Z",
      next_billing_at: "2026-05-23T00:00:00Z",
    };

    const now = new Date("2026-05-25T00:00:00Z");
    expect(isTrialCurrentlyActive(expiredTrial, now)).toBe(false);
    const primary = pickPrimarySubscriptionForDisplay(
      [expiredTrial, scheduledAfterExpiredTrial],
      now,
    );
    expect(primary?.id).toBe("pending-1");
  });

  it("encontra plano agendado na lista", () => {
    expect(findScheduledPaidPlan([trial, scheduled])?.id).toBe("pending-1");
  });

  it("usa rótulo de cancelar renovação para plano agendado após trial", () => {
    const copy = getSubscriptionCancelCopy(scheduled);
    expect(copy.buttonLabel).toBe("Cancelar renovação automática");
    expect(copy.dialogDescription).toContain("teste gratuito");
  });

  it("considera plano agendado em tolerância após fim do trial", () => {
    expect(
      isScheduledPaidHandoffInGrace(scheduled, new Date("2026-06-06T00:00:00Z")),
    ).toBe(true);
    expect(
      scheduledPaidGraceEndsAt(scheduled, new Date("2026-06-06T00:00:00Z"))?.toISOString(),
    ).toBe("2026-06-11T00:00:00.000Z");
    expect(
      isScheduledPaidHandoffInGrace(scheduled, new Date("2026-06-20T00:00:00Z")),
    ).toBe(false);
  });

  it("mostra período liberado quando handoff já passou e está em tolerância", () => {
    const display = getCustomerSubscriptionDisplay(
      scheduled,
      new Date("2026-05-25T00:00:00Z"),
    );
    expect(display.mode).toBe("scheduled_after_trial");

    const displayDuringGrace = getCustomerSubscriptionDisplay(
      {
        ...scheduled,
        current_period_end: "2026-05-23T00:00:00Z",
        next_billing_at: "2026-05-23T00:00:00Z",
      },
      new Date("2026-05-25T00:00:00Z"),
    );
    expect(displayDuringGrace.mode).toBe("scheduled_handoff_grace");
    expect(displayDuringGrace.periodPrimaryLabel).toBe("Período liberado");
  });
});
