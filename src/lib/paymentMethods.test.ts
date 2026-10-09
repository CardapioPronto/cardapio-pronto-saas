import { describe, expect, it } from "vitest";
import { classifyOrderPayment, compareByMethod } from "./paymentMethods";

const o = (total: number, payment_method: string | null, payment_provider: string | null = "pdv", payment_status = "paid") => ({
  id: String(Math.random()), total, payment_method, payment_provider, payment_status,
});

describe("paymentMethods", () => {
  it("classifica aliases, online e pedidos sem forma", () => {
    expect(classifyOrderPayment(o(10, "credit_card"))).toBe("credito");
    expect(classifyOrderPayment(o(10, "pix", "pagarme"))).toBe("online");
    expect(classifyOrderPayment(o(10, null, null, "pending"))).toBe("sem_forma");
  });

  it("compara forma a forma", () => {
    const rows = compareByMethod(
      [o(50, "dinheiro"), o(30, "credito"), o(20, "credito"), o(15, null, null, "pending"), o(40, "pix", "pagarme")],
      { dinheiro: 50, pix: 0, credito: 45, debito: 0, voucher: 0 },
    );
    const credito = rows.find((r) => r.method === "credito")!;
    expect(credito).toMatchObject({ count: 2, system: 50, declared: 45, difference: -5 });
    expect(rows.find((r) => r.method === "dinheiro")!.difference).toBe(0);
    expect(rows.find((r) => r.method === "sem_forma")).toMatchObject({ count: 1, system: 15, declared: null });
    expect(rows.find((r) => r.method === "online")).toMatchObject({ system: 40 });
  });
});
