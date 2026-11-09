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

describe("pagamento misto com parcelas", () => {
  const misto = (total: number, splits?: { method: string; amount: number }[]) => ({
    id: String(Math.random()), total, payment_method: "misto", payment_provider: "pdv", payment_status: "paid", splits,
  });

  it("rateia parcelas válidas nas formas correspondentes", () => {
    const rows = compareByMethod(
      [misto(100, [{ method: "dinheiro", amount: 40 }, { method: "pix", amount: 60 }])],
      { dinheiro: 40, pix: 60, credito: 0, debito: 0, voucher: 0 },
    );
    expect(rows.find((r) => r.method === "dinheiro")).toMatchObject({ system: 40, difference: 0 });
    expect(rows.find((r) => r.method === "pix")).toMatchObject({ system: 60, difference: 0 });
    expect(rows.find((r) => r.method === "misto")).toBeUndefined();
  });

  it("misto sem parcelas válidas continua como pendência a explicar", () => {
    const rows = compareByMethod(
      [misto(100), misto(80, [{ method: "dinheiro", amount: 30 }])],
      { dinheiro: 0, pix: 0, credito: 0, debito: 0, voucher: 0 },
    );
    const row = rows.find((r) => r.method === "misto")!;
    expect(row).toMatchObject({ count: 2, system: 180, declared: null, difference: null });
  });

  it("soma com tolerância de um centavo é aceita", () => {
    const rows = compareByMethod(
      [misto(100, [{ method: "dinheiro", amount: 33.33 }, { method: "pix", amount: 33.33 }, { method: "credito", amount: 33.33 }])],
      { dinheiro: 33.33, pix: 33.33, credito: 33.33, debito: 0, voucher: 0 },
    );
    expect(rows.find((r) => r.method === "dinheiro")!.system).toBe(33.33);
    expect(rows.find((r) => r.method === "misto")).toBeUndefined();
  });
});
