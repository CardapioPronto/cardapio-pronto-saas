import { describe, expect, it } from "vitest";
import {
  getReceiptCardCopy,
  resolveReceiptBillingPhase,
  resolveReceiptChargeDisplayStatus,
} from "../../supabase/functions/_shared/pagarme-receipt-display.ts";

describe("resolveReceiptChargeDisplayStatus", () => {
  it("assinatura future + charge failed → agendada (não falhou)", () => {
    expect(
      resolveReceiptChargeDisplayStatus({
        chargeStatus: "failed",
        subscriptionStatus: "future",
        hasCardOnFile: true,
      }),
    ).toBe("scheduled");
  });

  it("charge paga permanece paga", () => {
    expect(
      resolveReceiptChargeDisplayStatus({
        chargeStatus: "paid",
        subscriptionStatus: "active",
      }),
    ).toBe("paid");
  });
});

describe("resolveReceiptBillingPhase", () => {
  it("sem cobrança paga → primeira agendada", () => {
    expect(
      resolveReceiptBillingPhase({ displayStatus: "scheduled", paidChargesCount: 0 }),
    ).toBe("first_scheduled");
  });

  it("com cobranças pagas → próxima agendada", () => {
    expect(
      resolveReceiptBillingPhase({ displayStatus: "scheduled", paidChargesCount: 2 }),
    ).toBe("renewal_scheduled");
    const copy = getReceiptCardCopy("renewal_scheduled", {
      amountFormatted: "R$ 59,90",
      scheduleDate: "04/07/2026",
    });
    expect(copy.title).toBe("Próxima cobrança");
  });
});
