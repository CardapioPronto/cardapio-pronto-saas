import { describe, expect, it } from "vitest";
import {
  formatCycleChangeDescription,
  getYearlyPlanDisplay,
  yearlyPlanTotalReais,
} from "./planPricingDisplay";

describe("planPricingDisplay", () => {
  it("total anual = mensal equivalente × 12", () => {
    expect(yearlyPlanTotalReais(49.9)).toBe(598.8);
    const display = getYearlyPlanDisplay(49.9);
    expect(display.totalAnnualLabel).toContain("598,80");
    expect(display.perMonthLabel).toContain("49,90");
  });

  it("texto de mudança para anual cita total e parcelas", () => {
    const text = formatCycleChangeDescription("yearly", 59.9, 49.9);
    expect(text).toContain("598,80");
    expect(text).toContain("49,90");
    expect(text).toContain("12x");
  });
});
