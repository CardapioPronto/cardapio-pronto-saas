import { describe, expect, it } from "vitest";

/** Espelha regras de takeout do push Pubfy → iFood. */
function isTakeoutLike(orderType: string) {
  const t = orderType.toUpperCase();
  return t === "TAKEOUT" || t === "DINE_IN" || t === "INDOOR";
}

describe("isTakeoutLike", () => {
  it("identifica retirada e salão", () => {
    expect(isTakeoutLike("TAKEOUT")).toBe(true);
    expect(isTakeoutLike("DINE_IN")).toBe(true);
    expect(isTakeoutLike("DELIVERY")).toBe(false);
  });
});
