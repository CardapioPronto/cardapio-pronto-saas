import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

const SERVICE_WORKER_VERSION = "2026-06-18.pwa-advanced.1";

async function readPWAStatus(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return null;

    return new Promise<{
      serviceWorkerVersion: string;
      appShellCache: string;
      staticAssetCache: string;
      appShellUrls: string[];
    } | null>((resolve) => {
      const requestId = `test-${Date.now()}`;
      const channel = new MessageChannel();
      const timeoutId = window.setTimeout(() => {
        channel.port1.close();
        resolve(null);
      }, 5_000);

      channel.port1.onmessage = (event) => {
        if (event.data?.type !== "PWA_STATUS" || event.data?.requestId !== requestId) return;

        window.clearTimeout(timeoutId);
        channel.port1.close();
        resolve(event.data.payload);
      };

      worker.postMessage({ type: "GET_PWA_STATUS", requestId }, [channel.port2]);
    });
  });
}

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

  const pwaStatus = await readPWAStatus(page);
  expect(pwaStatus?.serviceWorkerVersion).toBe(SERVICE_WORKER_VERSION);
  expect(pwaStatus?.appShellCache).toContain(SERVICE_WORKER_VERSION);
  expect(pwaStatus?.staticAssetCache).toContain(SERVICE_WORKER_VERSION);
  expect(pwaStatus?.appShellUrls).toContain("/manifest.webmanifest");

  const cacheNames = await page.evaluate(() => caches.keys());
  expect(cacheNames.some((cacheName) => cacheName.includes(SERVICE_WORKER_VERSION))).toBe(true);

  await expect(page.getByText("Sem conexão com a internet")).toBeHidden();

  await context.setOffline(true);
  await expect(page.getByText("Sem conexão com a internet")).toBeVisible({ timeout: 30_000 });

  await page.reload();
  await expect(page.locator("#root")).toBeAttached();
  await expect(page.getByText("Sem conexão com a internet")).toBeVisible({ timeout: 30_000 });

  await context.setOffline(false);
  await expect(page.getByText("Sem conexão com a internet")).toBeHidden({ timeout: 30_000 });
});

test("PWA exibe aviso quando uma nova versão é sinalizada", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({ timeout: 90_000 });

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("pubfy:pwa-update-available"));
  });

  await expect(page.getByText("Nova versão disponível")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Atualizar" })).toBeVisible();
});
