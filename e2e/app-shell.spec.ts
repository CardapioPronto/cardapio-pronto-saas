import { expect, test } from "@playwright/test";

test("aplicação carrega e monta o root", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#pubfy-initial-loader", { state: "detached", timeout: 90_000 });
  await expect(page.getByRole("link", { name: /Pubfy/i }).first()).toBeVisible({ timeout: 30_000 });
});
