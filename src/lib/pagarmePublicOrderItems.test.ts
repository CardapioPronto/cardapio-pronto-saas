import { describe, expect, it } from "vitest";
import { buildPagarmeOrderLineItems, toCents } from "../../supabase/functions/_shared/pagarme-public-order-items.ts";

describe("buildPagarmeOrderLineItems", () => {
  it("inclui taxa de entrega na soma cobrada", () => {
    const lines = buildPagarmeOrderLineItems({
      items: [{ id: "a", product_name: "Burger", quantity: 2, price: 25 }],
      orderTotal: 60,
      deliveryFee: 10,
    });
    const totalCents = lines.reduce((s, li) => s + li.amount * li.quantity, 0);
    expect(totalCents).toBe(toCents(60));
    expect(lines.some((li) => li.code === "delivery_fee")).toBe(true);
  });

  it("reconcilia desconto de cupom reduzindo linhas de produto", () => {
    const lines = buildPagarmeOrderLineItems({
      items: [{ id: "a", product_name: "Burger", quantity: 1, price: 50 }],
      orderTotal: 45,
      deliveryFee: 5,
    });
    const totalCents = lines.reduce((s, li) => s + li.amount * li.quantity, 0);
    expect(totalCents).toBe(toCents(45));
  });

  it("pedido sem entrega mantém só produtos", () => {
    const lines = buildPagarmeOrderLineItems({
      items: [{ id: "a", product_name: "Suco", quantity: 1, price: 12 }],
      orderTotal: 12,
      deliveryFee: 0,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].code).toBe("a");
  });
});
