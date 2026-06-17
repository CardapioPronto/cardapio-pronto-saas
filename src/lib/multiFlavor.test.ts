import { describe, expect, it } from "vitest";
import { calculateMultiFlavorUnitPrice } from "./multiFlavor";

const flavors = [
  { product_id: "a", name: "Calabresa", price: 58, final_price: 58, portion: 0.5 },
  { product_id: "b", name: "Portuguesa", price: 72, final_price: 72, portion: 0.5 },
];

describe("calculateMultiFlavorUnitPrice", () => {
  it("cobra o sabor mais caro quando a estratégia é highest", () => {
    expect(calculateMultiFlavorUnitPrice(flavors, "highest")).toBe(72);
  });

  it("cobra a média proporcional quando a estratégia é average", () => {
    expect(calculateMultiFlavorUnitPrice(flavors, "average")).toBe(65);
  });

  it("considera preço promocional quando solicitado", () => {
    const promotionalFlavors = [
      { product_id: "a", name: "Calabresa", price: 58, final_price: 50, portion: 0.5 },
      { product_id: "b", name: "Portuguesa", price: 72, final_price: 60, portion: 0.5 },
    ];

    expect(calculateMultiFlavorUnitPrice(promotionalFlavors, "highest")).toBe(60);
    expect(calculateMultiFlavorUnitPrice(promotionalFlavors, "average", false)).toBe(65);
  });
});
