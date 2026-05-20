import { describe, expect, it } from "vitest";
import {
  computeRemainingCreditMs,
  resolvePaidSubscriptionPeriod,
} from "../../supabase/functions/_shared/pagarme-checkout-subscription.ts";

describe("resolvePaidSubscriptionPeriod", () => {
  it("ignora fim de período curto do Pagar.me (14 dias) e usa 1 mês", () => {
    const start = new Date("2026-05-20T18:20:11Z");
    const { periodEnd, nextBilling } = resolvePaidSubscriptionPeriod({
      billingCycle: "monthly",
      periodStart: start,
      pagarmePeriodEnd: "2026-06-03T18:20:11Z",
      pagarmeNextBilling: "2026-06-03T18:20:11Z",
    });
    expect(periodEnd.toISOString()).toBe("2026-06-20T18:20:11.000Z");
    expect(nextBilling.toISOString()).toBe("2026-06-20T18:20:11.000Z");
  });

  it("soma dias restantes do período ativo ao novo mês (renovação antecipada)", () => {
    const now = new Date("2026-06-16T12:00:00Z");
    const creditMs = computeRemainingCreditMs(now, {
      status: "active",
      current_period_end: "2026-06-20T18:20:11Z",
    });
    expect(creditMs).toBeGreaterThan(0);

    const { periodEnd } = resolvePaidSubscriptionPeriod({
      billingCycle: "monthly",
      periodStart: now,
      remainingCreditMs: creditMs,
    });
    expect(periodEnd.toISOString()).toBe("2026-07-20T18:20:11.000Z");
  });

  it("soma dias restantes do trial ao primeiro mês pago", () => {
    const now = new Date("2026-05-16T12:00:00Z");
    const creditMs = computeRemainingCreditMs(now, {
      status: "trialing",
      is_trial: true,
      trial_ends_at: "2026-05-20T18:20:11Z",
    });
    const { periodEnd } = resolvePaidSubscriptionPeriod({
      billingCycle: "monthly",
      periodStart: now,
      remainingCreditMs: creditMs,
    });
    expect(periodEnd.toISOString()).toBe("2026-06-20T18:20:11.000Z");
  });
});
