import { describe, expect, it } from "vitest";
import {
  extractCustomerAndCardFromOrder,
  needsRecurringSubscriptionFromOrderId,
  pagarmePlanIdForCycle,
} from "../../supabase/functions/_shared/pagarme-recurring-subscription.ts";
import { planAmountBreakdownForCardCheckout } from "../../supabase/functions/_shared/pagarme-plan-pricing.ts";
import {
  pagarmeCardExpYear,
  sanitizeCardHolderName,
} from "../../supabase/functions/_shared/pagarme-card-subscription-checkout.ts";

describe("pagarme-recurring-subscription", () => {
  it("extracts customer and card from credit card charge", () => {
    const result = extractCustomerAndCardFromOrder({
      id: "or_123",
      customer: { id: "cus_root" },
      charges: [{
        payment_method: "credit_card",
        customer: { id: "cus_charge" },
        last_transaction: { card: { id: "card_abc" } },
      }],
    });
    expect(result.customerId).toBe("cus_root");
    expect(result.cardId).toBe("card_abc");
  });

  it("detects order ids that still need recurring subscription", () => {
    expect(needsRecurringSubscriptionFromOrderId("or_abc")).toBe(true);
    expect(needsRecurringSubscriptionFromOrderId("ord_xyz")).toBe(true);
    expect(needsRecurringSubscriptionFromOrderId("sub_abc")).toBe(false);
    expect(needsRecurringSubscriptionFromOrderId(null)).toBe(false);
  });

  it("sanitizes holder name for Pagar.me", () => {
    expect(sanitizeCardHolderName("João 123 Silva")).toBe("Joao Silva");
    expect(sanitizeCardHolderName("AB")).toBe("Titular Cartao");
  });

  it("sends exp_year as yy to match Pagar.me examples", () => {
    expect(pagarmeCardExpYear(2030)).toBe(30);
    expect(pagarmeCardExpYear(30)).toBe(30);
  });

  it("card checkout charges catalog amount in centavos (59.90 -> 5990)", () => {
    const breakdown = planAmountBreakdownForCardCheckout(
      { price_monthly: 59.9, price_yearly: 49 },
      "monthly",
    );
    expect(breakdown.amount_cents).toBe(5990);
    expect(breakdown.catalog_amount_cents).toBe(5990);
  });

  it("resolves pagarme plan id by billing cycle", () => {
    expect(
      pagarmePlanIdForCycle({
        pagarme_plan_id_monthly: "plan_m",
        pagarme_plan_id_yearly: "plan_y",
      }, "monthly"),
    ).toBe("plan_m");
    expect(
      pagarmePlanIdForCycle({
        pagarme_plan_id_monthly: "plan_m",
        pagarme_plan_id_yearly: "plan_y",
      }, "yearly"),
    ).toBe("plan_y");
  });
});
