import { describe, expect, it } from "vitest";
import { formatCentsToBrl } from "./formatCents";

describe("formatCentsToBrl", () => {
  it("formata centavos em BRL", () => {
    expect(formatCentsToBrl(1050)).toMatch(/10,50|10\.50/);
  });

  it("formata zero", () => {
    expect(formatCentsToBrl(0)).toMatch(/0,00|0\.00/);
  });
});
