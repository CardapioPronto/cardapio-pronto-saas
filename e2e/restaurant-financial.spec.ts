import { expect, test } from "@playwright/test";
import { installAuthenticatedSupabaseMock } from "./fixtures/authenticatedSupabase";

test("financial overview reads receipts and orders without opening cash (simulated)", async ({ page }) => {
  await installAuthenticatedSupabaseMock(page, "owner");
  const writes: string[] = [];
  page.on("request", request => {
    if (request.url().includes("/rest/v1/cash_register_sessions") && request.method() !== "GET") writes.push(request.method());
  });
  await page.route("**/rest/v1/cash_register_sessions*", route => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/rpc/get_cash_shift_activity", async route => {
    const body = route.request().postDataJSON();
    const now = new Date(Date.now() - 60_000).toISOString();
    const base = { id: "local", order_number: "101", created_at: now, paid_at: now, customer_name: "Cliente local", total: 100, status: "finalizado", payment_method: "pix", payment_status: "paid", payment_provider: "pdv", source: "app", order_type: "balcao" };
    await route.fulfill({ json: { since: body.p_since, until: body.p_until, orders: [
      base,
      { ...base, id: "pending", order_number: "102", total: 50, payment_status: "pending", paid_at: null },
      { ...base, id: "external", order_number: "103", total: 80, payment_provider: "pagarme" },
    ] } });
  });
  await page.goto("/financeiro");
  const metric = (title: string) => page.getByText(title, { exact: true }).locator("..");
  await expect(metric("Recebimentos locais")).toContainText("100,00");
  await expect(metric("Pagamentos pendentes")).toContainText("50,00");
  await expect(metric("Recebido por canal externo")).toContainText("80,00");
  await expect(metric("Saldo do movimento registrado")).toContainText("100,00");
  await expect(page.locator(".recharts-bar-rectangle path").first()).toBeVisible();
  await page.screenshot({ path: "/tmp/browser/financeiro-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(metric("Recebimentos locais")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/browser/financeiro-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.getByRole("tab", { name: "Recebimentos", exact: true }).click();
  await expect(page.getByText("#101", { exact: true })).toBeVisible();
  await expect(page.getByText("#103", { exact: true })).not.toBeVisible();
  await page.getByLabel("Situação dos recebimentos").click();
  await page.getByRole("option", { name: "Canais externos (1)", exact: true }).click();
  await expect(page.getByText("#103", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Pedidos", exact: true }).click();
  await expect(page.getByText("#102", { exact: true })).toBeVisible();
  await page.getByLabel("Buscar pedido ou cliente").fill("102");
  await expect(page.getByText("#101", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Hoje", exact: true }).click();
  await expect(metric("Vendas no período")).toContainText("230,00");
  await page.route("**/rest/v1/rpc/get_cash_shift_activity", route => route.fulfill({ status: 403, json: { message: "Restaurante não autorizado", code: "42501" } }));
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByText("Consulta indisponível")).toBeVisible();
  await expect(page.getByText("Vendas no período", { exact: true })).not.toBeVisible();
  expect(writes).toEqual([]);
});

test("financial overview requires report access before requesting data (simulated)", async ({ page }) => {
  await installAuthenticatedSupabaseMock(page, "restricted_employee");
  let reads = 0;
  await page.route("**/rest/v1/rpc/get_cash_shift_activity", async route => {
    reads += 1;
    await route.fulfill({ json: {} });
  });
  await page.goto("/financeiro");
  await expect(page.getByRole("heading", { name: "Acesso Negado", exact: true })).toBeVisible();
  expect(reads).toBe(0);
});