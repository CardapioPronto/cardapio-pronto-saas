import { describe, expect, it } from "vitest";
import {
  findScheduledPaidPlan,
  getSubscriptionCancelCopy,
  getVisibleSubscriptionsForCustomer,
  isScheduledPaidHandoffInGrace,
  isScheduledPaidAfterTrial,
  pickPrimarySubscriptionForDisplay,
} from "./subscriptionCustomerDisplay";

const trial = {
  id: "trial-1",
  status: "trialing",
  is_trial: true,
  trial_ends_at: "2026-06-04T00:00:00Z",
  current_period_start: "2026-05-21T00:00:00Z",
  current_period_end: "2026-06-04T00:00:00Z",
  has_pagarme_subscription: false,
  pagarme_subscription_id: null,
  last_payment_status: null,
};

const scheduled = {
  id: "pending-1",
  status: "pending",
  is_trial: false,
  trial_ends_at: null,
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
    const primary = pickPrimarySubscriptionForDisplay([trial, scheduled]);
    expect(primary?.id).toBe("trial-1");
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
      isScheduledPaidHandoffInGrace(scheduled, new Date("2026-06-20T00:00:00Z")),
    ).toBe(false);
  });
});
