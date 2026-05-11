import { expect, test } from "@playwright/test";

test("aplicação carrega e monta o root", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).toBeAttached();
});
