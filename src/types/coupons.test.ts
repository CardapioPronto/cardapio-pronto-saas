import { describe, expect, it } from "vitest";
import type { Coupon } from "./coupons";
import { calculateCouponDiscount, generateCouponCode, isValidCoupon } from "./coupons";

const baseCoupon = (): Coupon => ({
  id: "c1",
  restaurant_id: "r1",
  code: "TEST10",
  title: "Test",
  description: null,
  discount_type: "percentage",
  discount_value: 10,
  max_uses: null,
  usage_count: 0,
  valid_from: "2026-01-01T00:00:00Z",
  valid_until: "2030-12-31T23:59:59Z",
  minimum_order_value: null,
  applicable_to: "all",
  applicable_products: null,
  applicable_categories: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("calculateCouponDiscount", () => {
  it("percentual sobre o pedido", () => {
    expect(calculateCouponDiscount(100, "percentage", 15)).toBe(15);
  });

  it("respeita teto em percentual", () => {
    expect(calculateCouponDiscount(1000, "percentage", 50, 40)).toBe(40);
  });

  it("valor fixo não ultrapassa o pedido", () => {
    expect(calculateCouponDiscount(30, "fixed", 50)).toBe(30);
  });
});

describe("isValidCoupon", () => {
  it("aceita cupom ativo dentro do período", () => {
    expect(isValidCoupon(baseCoupon(), 50)).toBe(true);
  });

  it("rejeita inativo", () => {
    const c = { ...baseCoupon(), is_active: false };
    expect(isValidCoupon(c, 50)).toBe(false);
  });

  it("rejeita abaixo do mínimo", () => {
    const c = { ...baseCoupon(), minimum_order_value: 100 };
    expect(isValidCoupon(c, 50)).toBe(false);
  });

  it("rejeita quando esgotou max_uses", () => {
    const c = { ...baseCoupon(), max_uses: 2, usage_count: 2 };
    expect(isValidCoupon(c, 50)).toBe(false);
  });
});

describe("generateCouponCode", () => {
  it("começa com prefixo e tem comprimento limitado", () => {
    const code = generateCouponCode("PROMO");
    expect(code.startsWith("PROMO")).toBe(true);
    expect(code.length).toBeLessThanOrEqual(50);
  });
});
