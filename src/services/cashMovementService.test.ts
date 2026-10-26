import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { summarizeCashMovements, validateCashMovement } from "./cashMovementService";

describe("cash movements", () => {
  it("sangrias saem e suprimentos entram no líquido", () => {
    expect(summarizeCashMovements([
      { kind: "sangria", amount: 100 }, { kind: "sangria", amount: 50.5 }, { kind: "suprimento", amount: 30 },
    ])).toEqual({ withdrawals: 150.5, supplies: 30, netWithdrawals: 120.5 });
  });
  it("sem movimentos tudo zero", () => {
    expect(summarizeCashMovements([])).toEqual({ withdrawals: 0, supplies: 0, netWithdrawals: 0 });
  });
  it("exige valor positivo", () => {
    expect(validateCashMovement({ amount: 0, reason: "Depósito" })).not.toBeNull();
  });
  it("exige motivo", () => {
    expect(validateCashMovement({ amount: 10, reason: "  " })).not.toBeNull();
    expect(validateCashMovement({ amount: 10, reason: "Depósito banco" })).toBeNull();
  });
});
