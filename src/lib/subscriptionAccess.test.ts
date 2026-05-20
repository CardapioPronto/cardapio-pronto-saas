import { describe, expect, it } from "vitest";
import { computeSubscriptionAccess } from "./subscriptionAccess";

describe("computeSubscriptionAccess", () => {
  const fixed = new Date("2026-06-15T12:00:00Z");

  it("trial vigente libera acesso", () => {
    const r = computeSubscriptionAccess(
      {
        status: "trialing",
        is_trial: true,
        trial_ends_at: "2026-06-20T00:00:00Z",
        current_period_end: null,
      },
      fixed,
    );
    expect(r.hasActiveSubscription).toBe(true);
    expect(r.isInTrial).toBe(true);
    expect(r.daysLeftInTrial).toBeGreaterThan(0);
  });

  it("trial expirado bloqueia", () => {
    const r = computeSubscriptionAccess(
      {
        status: "trialing",
        is_trial: true,
        trial_ends_at: "2026-06-01T00:00:00Z",
        current_period_end: null,
      },
      fixed,
    );
    expect(r.hasActiveSubscription).toBe(false);
  });

  it("active sempre libera", () => {
    const r = computeSubscriptionAccess(
      {
        status: "active",
        is_trial: false,
        trial_ends_at: null,
        current_period_end: null,
      },
      fixed,
    );
    expect(r.hasActiveSubscription).toBe(true);
  });

  it("past_due dentro da graça de current_period_end libera", () => {
    const r = computeSubscriptionAccess(
      {
        status: "past_due",
        is_trial: false,
        trial_ends_at: null,
        current_period_end: "2026-06-30T00:00:00Z",
      },
      fixed,
    );
    expect(r.hasActiveSubscription).toBe(true);
  });

  it("pending não libera acesso", () => {
    const r = computeSubscriptionAccess(
      {
        status: "pending",
        is_trial: false,
        trial_ends_at: null,
        current_period_end: null,
      },
      fixed,
    );
    expect(r.hasActiveSubscription).toBe(false);
  });

  it("past_due fora da graça bloqueia", () => {
    const r = computeSubscriptionAccess(
      {
        status: "past_due",
        is_trial: false,
        trial_ends_at: null,
        current_period_end: "2026-06-01T00:00:00Z",
      },
      fixed,
    );
    expect(r.hasActiveSubscription).toBe(false);
  });
});
