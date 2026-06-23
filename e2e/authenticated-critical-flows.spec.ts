import { expect, test } from "@playwright/test";
import { installAuthenticatedSupabaseMock } from "./fixtures/authenticatedSupabase";

test.describe.configure({ timeout: 120_000 });

test.describe("fluxos críticos autenticados", () => {
  test("dono acessa indicadores financeiros e abre o PDV com catálogo", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Faturamento (30 dias)")).toBeVisible();
    await expect(page.getByText("R$ 1.234,56", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Abrir PDV" }).first().click();
    await expect(page).toHaveURL(/\/pdv$/);
    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible();
    await expect(page.getByText("X-Burger E2E", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Histórico" })).toBeVisible();
  });

  test("funcionário restrito não vê financeiro nem acessa configurações", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "restricted_employee");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Faturamento (30 dias)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Restrito" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Configurações" })).toHaveCount(0);

    await page.goto("/configuracoes");
    await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    await expect(page.getByText("Ver Configurações", { exact: true })).toBeVisible();
  });
});

test.describe("controle de acesso por assinatura", () => {
  test("trial ativo libera o dashboard e exibe os dias restantes", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "trial_active");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/período de teste/).first()).toBeVisible();
    await expect(page.getByText(/Restam 5 dias/)).toBeVisible();
  });

  test("trial expirado bloqueia a área autenticada", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "trial_expired");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Assinatura Necessária" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/período de teste expirou/i)).toBeVisible();
  });

  test("past_due dentro da tolerância mantém acesso e alerta o dono", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "past_due_grace");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Pagamento em atraso", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/continua com acesso por mais 5 dias/i).first()).toBeVisible();
  });

  test("past_due fora da tolerância bloqueia a operação", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "past_due_blocked");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Assinatura Necessária" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/prazo de tolerância após o vencimento terminou/i)).toBeVisible();
  });
});
