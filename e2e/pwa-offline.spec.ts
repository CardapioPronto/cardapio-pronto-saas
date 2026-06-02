import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

test("PWA mantém shell carregado e sinaliza queda de conexão", async ({ context, page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({ timeout: 90_000 });

  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.ready), null, {
    timeout: 30_000,
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({ timeout: 90_000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, {
    timeout: 30_000,
  });

  await expect(page.getByText("Sem conexão com a internet")).toBeHidden();

  await context.setOffline(true);
  await expect(page.getByText("Sem conexão com a internet")).toBeVisible({ timeout: 30_000 });

  await page.reload();
  await expect(page.locator("#root")).toBeAttached();
  await expect(page.getByText("Sem conexão com a internet")).toBeVisible({ timeout: 30_000 });

  await context.setOffline(false);
  await expect(page.getByText("Sem conexão com a internet")).toBeHidden({ timeout: 30_000 });
});
