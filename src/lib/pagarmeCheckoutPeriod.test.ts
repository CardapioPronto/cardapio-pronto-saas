import { describe, expect, it } from "vitest";
import {
  buildLocalSubscriptionFromPagarme,
  computeRemainingCreditMs,
  pagarmeSubscriptionStartAt,
  pendingSubscriptionInsertRow,
  remoteStartAtExceedsExpected,
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

  it("registro pending alinha período ao trial local (sem datas invertidas)", () => {
    const localSub = buildLocalSubscriptionFromPagarme({
      pagarme: {
        status: "future",
        start_at: "2026-06-04T12:00:00Z",
      },
      billingCycle: "monthly",
      paymentMethod: "credit_card",
      priorEntitlement: {
        status: "trialing",
        is_trial: true,
        trial_start: "2026-05-06T10:00:00Z",
        trial_ends_at: "2026-05-20T18:20:11Z",
      },
    });

    const row = pendingSubscriptionInsertRow(localSub, {
      status: "trialing",
      is_trial: true,
      trial_start: "2026-05-06T10:00:00Z",
      trial_ends_at: "2026-05-20T18:20:11Z",
    });

    expect(row.status).toBe("pending");
    expect(row.current_period_start).toBe("2026-05-06T10:00:00.000Z");
    expect(row.current_period_end).toBe("2026-05-20T18:20:11.000Z");
    expect(
      new Date(row.current_period_end!).getTime(),
    ).toBeGreaterThanOrEqual(new Date(row.current_period_start!).getTime());
  });

  it("não transforma tentativa failed do Pagar.me em entitlement local", () => {
    const localSub = buildLocalSubscriptionFromPagarme({
      pagarme: { status: "failed" },
      billingCycle: "monthly",
      paymentMethod: "credit_card",
      priorEntitlement: {
        status: "trialing",
        is_trial: true,
        trial_ends_at: "2026-05-20T18:20:11Z",
      },
    });

    expect(localSub.status).toBe("canceled");
  });

  it("agenda start_at no Pagar.me para o fim do trial local", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const startAt = pagarmeSubscriptionStartAt(now, {
      status: "trialing",
      is_trial: true,
      trial_ends_at: "2026-05-23T18:00:00Z",
    });
    expect(startAt).toBe("2026-05-23T18:00:00.000Z");
  });

  it("não trata trial remoto do Pagar.me como trial local no checkout pago", () => {
    const localSub = buildLocalSubscriptionFromPagarme({
      pagarme: { status: "trialing" },
      billingCycle: "monthly",
      paymentMethod: "credit_card",
      planTrialDays: 14,
    });

    expect(localSub.status).toBe("pending");
  });

  it("detecta start_at remoto muito depois do fim do trial local", () => {
    expect(
      remoteStartAtExceedsExpected({
        expectedStartAt: "2026-05-23T15:37:07Z",
        remoteStartAt: "2026-06-04T00:00:00Z",
      }),
    ).toBe(true);

    expect(
      remoteStartAtExceedsExpected({
        expectedStartAt: "2026-05-23T15:37:07Z",
        remoteStartAt: "2026-05-24T00:00:00Z",
      }),
    ).toBe(false);
  });
});
