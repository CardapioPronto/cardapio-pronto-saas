import { describe, expect, it } from "vitest";
import { parseMoneyInput, summarizeCashClosing } from "./cashRegister";

const base = {
  openingAmount: 100,
  declaredCash: 0,
  declaredPix: 0,
  declaredCredit: 0,
  declaredDebit: 0,
  declaredVoucher: 0,
  withdrawals: 0,
};

describe("parseMoneyInput", () => {
  it("aceita formato brasileiro e ponto decimal", () => {
    expect(parseMoneyInput("1.234,56")).toBe(1234.56);
    expect(parseMoneyInput("10.5")).toBe(10.5);
    expect(parseMoneyInput("")).toBe(0);
    expect(parseMoneyInput("-5")).toBe(0);
  });
});

describe("summarizeCashClosing", () => {
  it("fecha sem diferença quando valores batem", () => {
    const result = summarizeCashClosing(
      { ...base, declaredCash: 150, declaredPix: 30, declaredCredit: 70, declaredDebit: 50 },
      200,
    );
    expect(result.declaredSales).toBe(200);
    expect(result.cardMachineTotal).toBe(120);
    expect(result.status).toBe("ok");
  });

  it("considera sangrias como dinheiro vendido", () => {
    const result = summarizeCashClosing({ ...base, declaredCash: 120, withdrawals: 80 }, 100);
    expect(result.difference).toBe(0);
  });

  it("indica falta e sobra", () => {
    expect(summarizeCashClosing({ ...base, declaredCash: 180 }, 100).status).toBe("falta");
    expect(summarizeCashClosing({ ...base, declaredCash: 210 }, 100).status).toBe("sobra");
  });
});
