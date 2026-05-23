import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

/** Header da landing (link da marca) fica visível em qualquer breakpoint; o `<nav>` desktop usa `hidden md:flex`. */
async function waitForPublicHeader(page: import("@playwright/test").Page) {
  await expect(
    page.getByRole("link", { name: "Pubfy página inicial" }).first(),
  ).toBeVisible({ timeout: 90_000 });
}

test("landing carrega e define título com Pubfy", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).toBeAttached();
  await expect(page).toHaveTitle(/Pubfy/i);
});

test("termos exibe o título principal", async ({ page }) => {
  await page.goto("/termos");
  await waitForPublicHeader(page);
  await expect(page.getByRole("heading", { name: /Termos de Serviço/i })).toBeVisible({
    timeout: 30_000,
  });
});

test("login exibe o formulário", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("banner de cookies pode ser aceito e permanece oculto após recarregar", async ({ page }) => {
  await page.goto("/");
  await waitForPublicHeader(page);
  await page.evaluate(() => {
    localStorage.removeItem("pubfy_cookie_consent_v1");
  });
  await page.reload();
  await waitForPublicHeader(page);
  const bar = page.getByTestId("cookie-consent");
  await expect(bar).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Entendi e continuar" }).click();
  await expect(bar).toBeHidden();
  await page.reload();
  await expect(bar).toBeHidden();
});
