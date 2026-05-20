import { describe, expect, it } from "vitest";
import {
  formatCardExpiryInput,
  parseCardExpiry,
} from "./paymentInputFormatters";

describe("formatCardExpiryInput", () => {
  it("formata dígitos progressivamente", () => {
    expect(formatCardExpiryInput("0")).toBe("0");
    expect(formatCardExpiryInput("05")).toBe("05");
    expect(formatCardExpiryInput("052")).toBe("05/2");
    expect(formatCardExpiryInput("0527")).toBe("05/27");
  });

  it("normaliza valor colado sem barra", () => {
    expect(formatCardExpiryInput("0527")).toBe("05/27");
  });
});

describe("parseCardExpiry", () => {
  it("extrai mês e ano com 2 dígitos", () => {
    expect(parseCardExpiry("05/27")).toEqual({ expMonth: "05", expYear: "27" });
  });

  it("rejeita valor incompleto", () => {
    expect(parseCardExpiry("05/2")).toBeNull();
    expect(parseCardExpiry("05")).toBeNull();
  });

  it("aceita dígitos sem barra quando há 4 números", () => {
    expect(parseCardExpiry("0527")).toEqual({ expMonth: "05", expYear: "27" });
  });
});
