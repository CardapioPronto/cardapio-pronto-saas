import { test, expect } from "@playwright/test";
import { installAuthenticatedSupabaseMock } from "./fixtures/authenticatedSupabase";

test("frozen closing report opens and exports all rows (simulated)", async ({ page }) => {
  await installAuthenticatedSupabaseMock(page, "owner");
  const restaurantId = "00000000-0000-4000-8000-000000000101";
  const closing = { id: "closed-report", restaurant_id: restaurantId, status: "closed", opened_by: "actor", closed_by: "actor",
    opened_at: "2026-10-27T10:00:00Z", closed_at: "2026-10-27T12:00:00Z", opening_amount: 100,
    declared_cash: 80, withdrawals: 30, supplies_total: 10, declared_pix: 60, declared_credit: 0, declared_debit: 0, declared_voucher: 0,
    system_sales_total: 60, system_received_total: 60, system_pending_total: 0, system_external_total: 0,
    closing_cash_received: 0, difference_amount: 0, notes: "Relatório de teste",
    closing_snapshot: [{ id: "order", order_number: 1, total: 60, class: "received", payment_method: "pix", paid_at: "2026-10-27T11:00:00Z" }] };
  await page.route("**/rest/v1/rpc/get_my_restaurant_access", route => route.fulfill({ json: [{ restaurant_id: restaurantId, restaurant_name: "Restaurante E2E", restaurant_slug: "restaurante-e2e", access_type: "owner", is_active_unit: true, permissions: ["cash_manage", "dashboard_view", "reports_view"] }] }));
  await page.route("**/rest/v1/cash_register_sessions*", route => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("restaurant_id")).toBe(`eq.${restaurantId}`);
    return route.fulfill({ json: params.has("id") ? closing : params.get("status") === "eq.closed" ? [closing] : null });
  });
  await page.route("**/rest/v1/rpc/get_users_basic_info", route => route.fulfill({ json: [{ id: "actor", name: "Gerente de teste" }] }));
  await page.route("**/rest/v1/cash_audit_events*", route => route.fulfill({ json: [], headers: { "content-range": "0-0/0" } }));
  await page.goto("/caixa");
  await page.getByRole("button", { name: "Ver relatório" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Gerente de teste").first()).toBeVisible();
  await expect(dialog.getByText("Pedidos congelados (1)")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("fechamento-closed-report.csv");
  await dialog.screenshot({ path: "/tmp/browser/cash-closing-report.png" });
  const popupPromise = page.waitForEvent("popup");
  await dialog.getByRole("button", { name: "Imprimir / PDF" }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole("heading", { name: "Pubfy — Fechamento de caixa" })).toBeVisible();
  await expect(popup.getByText("Relatório de teste", { exact: true })).toBeVisible();
});