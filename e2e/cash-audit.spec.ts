import { test, expect } from "@playwright/test";
import { installAuthenticatedSupabaseMock } from "./fixtures/authenticatedSupabase";

test("cash audit filters, paginates and opens immutable changes (simulated)", async ({ page }) => {
  await installAuthenticatedSupabaseMock(page, "owner");
  await page.route("**/rest/v1/rpc/get_my_restaurant_access", route => route.fulfill({ json: [{
    restaurant_id: "00000000-0000-4000-8000-000000000101", restaurant_name: "Restaurante E2E", restaurant_slug: "restaurante-e2e",
    access_type: "owner", is_active_unit: true, permissions: ["cash_manage", "dashboard_view", "reports_view"],
  }] }));
  await page.route("**/rest/v1/cash_register_sessions*", route => route.fulfill({ json: new URL(route.request().url()).searchParams.get("status") === "eq.closed" ? [] : null }));
  await page.route("**/rest/v1/rpc/get_users_basic_info", route => route.fulfill({ json: [{ id: "actor", name: "Gerente de teste", email: "gerente@pubfy.test" }] }));
  await page.route("**/rest/v1/cash_audit_events*", async route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("restaurant_id")).toBe("eq.00000000-0000-4000-8000-000000000101");
    const closed = url.searchParams.get("event_type") === "eq.cash_session_closed";
    const second = url.searchParams.get("offset") === "25";
    const event = { id: second ? "second" : "first", actor_id: "actor", restaurant_id: "00000000-0000-4000-8000-000000000101", created_at: new Date().toISOString(), event_type: closed ? "cash_session_closed" : "payment_method_changed", order_id: closed ? null : "pedido-123", session_id: closed ? "turno-123" : null, old_value: closed ? null : { payment_method: "dinheiro", payment_status: "paid" }, new_value: closed ? { difference: -20, received: 100, notes: "Conferência de teste" } : { payment_method: "pix", payment_status: "paid" } };
    await route.fulfill({ json: [event], headers: { "content-range": "0-0/26", "access-control-expose-headers": "content-range" } });
  });
  await page.goto("/caixa");
  const audit = page.getByRole("region", { name: "Auditoria do caixa" });
  await expect(audit.getByText("Gerente de teste")).toBeVisible();
  await audit.getByRole("button", { name: "Ver evento first" }).click();
  await expect(page.getByRole("dialog").getByText("Dinheiro", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("PIX", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await audit.getByRole("button", { name: "Próxima página do histórico" }).click();
  await expect(audit.getByRole("button", { name: "Ver evento second" })).toBeVisible();
  await audit.getByLabel("Ação", { exact: true }).click();
  await page.getByRole("option", { name: "Caixa fechado" }).click();
  await expect(audit.getByText("Caixa fechado", { exact: true }).last()).toBeVisible();
  await audit.getByRole("button", { name: "Ver evento first" }).click();
  await expect(page.getByRole("dialog").getByText("Conferência de teste")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/20,00/)).toBeVisible();
});