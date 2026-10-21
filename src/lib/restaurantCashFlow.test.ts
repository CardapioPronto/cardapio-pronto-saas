import { describe, expect, it } from "vitest";
import { buildRestaurantCashFlow, financialDate, financialPeriod, financialPreset } from "./restaurantCashFlow";
import type { CashActivityOrder } from "../../supabase/functions/_shared/cash-shift-activity";
const since = "2026-10-21T03:00:00.000Z";
const until = "2026-10-22T03:00:00.000Z";
const order = (changes: Partial<CashActivityOrder> = {}): CashActivityOrder => ({
  id: "local", order_number: "1", created_at: "2026-10-21T15:00:00Z", paid_at: "2026-10-21T16:00:00Z",
  customer_name: null, total: 100, status: "finalizado", payment_method: "pix", payment_provider: "pdv",
  payment_status: "paid", source: "app", order_type: "balcao", ...changes,
});
describe("restaurant cash flow without open session", () => {
  it("reads receipts without a cash session", () => {
    expect(buildRestaurantCashFlow([order()], [], since, until)).toMatchObject({ receivedTotal: 100, netRecorded: 100 });
  });
  it("separates earlier sales paid now, pending sales and external collections", () => {
    const data = buildRestaurantCashFlow([
      order({ created_at: "2026-10-20T12:00:00Z" }),
      order({ id: "pending", total: 50, payment_status: "pending", paid_at: null }),
      order({ id: "external", total: 80, payment_provider: "pagarme" }),
    ], [], since, until);
    expect(data).toMatchObject({ total: 130, receivedTotal: 100, pendingTotal: 50, externalTotal: 80, netRecorded: 100 });
  });
  it("subtracts only unique withdrawals closed in the selected period", () => {
    const closing = { id: "close", closed_at: "2026-10-21T20:00:00.000Z", withdrawals: 20 };
    expect(buildRestaurantCashFlow([order()], [closing, closing, { ...closing, id: "outside", closed_at: until }], since, until))
      .toMatchObject({ withdrawals: 20, netRecorded: 80 });
  });
  it("groups payment date in São Paulo, not UTC", () => {
    const data = buildRestaurantCashFlow([order({ paid_at: "2026-10-22T02:00:00Z" })], [], since, until);
    expect(data.daily).toEqual([{ date: "2026-10-21", sales: 100, received: 100, external: 0, withdrawals: 0, net: 100 }]);
  });
  it("uses inclusive calendar days and clamps current-day reads to now", () => {
    const now = new Date("2026-10-21T22:00:00Z");
    expect(financialPeriod("2026-10-21", "2026-10-21", now)).toEqual({ since, until: now.toISOString() });
    expect(financialPreset(7, now)).toEqual({ start: "2026-10-15", end: "2026-10-21" });
    expect(financialDate(new Date("2026-10-22T02:00:00Z"))).toBe("2026-10-21");
  });
  it("rejects invalid dates, reversed dates and future starting dates", () => {
    const now = new Date("2026-10-21T22:00:00Z");
    for (const [start, end] of [["2026-02-30", "2026-03-01"], ["2026-10-21", "2026-10-20"], ["2026-10-22", "2026-10-22"]]) {
      expect(() => financialPeriod(start, end, now)).toThrow();
    }
  });
});