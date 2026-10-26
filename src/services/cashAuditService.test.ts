import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
import { cashAuditRange, fetchCashAudit, type CashAuditFilters } from "./cashAuditService";

const filters: CashAuditFilters = { startDate: "2026-10-26", endDate: "2026-10-26", action: "all", page: 0 };
describe("cash audit reads", () => {
  let query: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(() => {
    vi.clearAllMocks();
    query = Object.fromEntries(["select", "eq", "gte", "lt", "order", "range"].map(key => [key, vi.fn()]));
    for (const fn of Object.values(query)) fn.mockReturnValue(query);
    query.range.mockResolvedValue({ data: [], count: 0, error: null });
    mocks.from.mockReturnValue(query);
  });
  it("scopes every page to the restaurant and uses a half-open date interval", async () => {
    await fetchCashAudit("restaurant-a", filters);
    expect(query.eq).toHaveBeenCalledWith("restaurant_id", "restaurant-a");
    expect(query.gte).toHaveBeenCalledWith("created_at", new Date("2026-10-26T00:00:00").toISOString());
    expect(query.lt).toHaveBeenCalledWith("created_at", new Date("2026-10-27T00:00:00").toISOString());
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("paginates rather than silently limiting the history and filters action on the server", async () => {
    await fetchCashAudit("restaurant-a", { ...filters, action: "cash_session_closed", page: 1 });
    expect(query.range).toHaveBeenCalledWith(25, 49);
    expect(query.eq).toHaveBeenCalledWith("event_type", "cash_session_closed");
    expect(query.select).toHaveBeenCalledWith("*", { count: "exact" });
  });
  it("resolves only the actors on the selected page", async () => {
    query.range.mockResolvedValue({ data: [{ id: "event", actor_id: "actor" }], count: 1, error: null });
    mocks.rpc.mockResolvedValue({ data: [{ id: "actor", name: "Gerente" }], error: null });
    const result = await fetchCashAudit("restaurant-a", filters);
    expect(mocks.rpc).toHaveBeenCalledWith("get_users_basic_info", { _user_ids: ["actor"] });
    expect(result.events[0].actorName).toBe("Gerente");
  });
  it("surfaces read failures rather than reporting an empty successful history", async () => {
    query.range.mockResolvedValue({ error: new Error("denied") });
    await expect(fetchCashAudit("restaurant-a", filters)).rejects.toThrow("denied");
  });
  it("rejects reversed dates and missing restaurant before querying", async () => {
    expect(() => cashAuditRange({ ...filters, startDate: "2026-10-27" })).toThrow();
    await expect(fetchCashAudit("", filters)).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});