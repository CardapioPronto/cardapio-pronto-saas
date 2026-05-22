/**
 * Grava demonstração do Dashboard (produção) para marketing.
 * Uso: node scripts/record-dashboard-demo.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir, readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const EMAIL = "sasiv59352@okcpress.com";
const PASSWORD = "Jr123456";
const BASE = "https://pubfy.com.br";
const OUT_DIR = "/opt/cursor/artifacts";
const VIDEO_DIR = join(OUT_DIR, "demo-record-tmp");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function slowScroll(page, totalPx, steps = 12, stepMs = 400) {
  const step = Math.ceil(totalPx / steps);
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), step);
    await sleep(stepMs);
  }
}

async function dismissCookieBanner(page) {
  const accept = page.getByRole("button", { name: /entendi e continuar/i });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click();
    await sleep(600);
  }
}

async function main() {
  await mkdir(VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--lang=pt-BR",
      "--disable-features=TranslateUI",
      "--disable-translate",
      "--no-first-run",
      "--disable-infobars",
    ],
  });

  const context = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } },
    colorScheme: "light",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [{ name: "pubfy_cookie_consent_v1", value: "accepted" }],
        },
      ],
    },
  });

  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60_000 });
  await dismissCookieBanner(page);
  await sleep(3000);

  await page.locator("#email").fill(EMAIL);
  await sleep(800);
  await page.locator("#password").fill(PASSWORD);
  await sleep(2000);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await sleep(8000);

  await slowScroll(page, 1500, 18, 550);
  await sleep(5000);

  await page.getByRole("link", { name: /^Pedidos$/i }).first().click();
  await page.waitForURL(/\/pedidos/, { timeout: 20_000 }).catch(() => {});
  await sleep(8000);

  await page.getByRole("link", { name: /cardápio digital|menu digital/i }).first().click();
  await page.waitForURL(/cardapio|menu-digital/i, { timeout: 20_000 }).catch(() => {});
  await sleep(8000);

  await page.getByRole("link", { name: /^Dashboard$/i }).first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(8000);

  await context.close();
  await browser.close();

  const files = (await readdir(VIDEO_DIR)).filter((f) => f.endsWith(".webm"));
  if (!files.length) {
    throw new Error("Nenhum vídeo gerado pelo Playwright");
  }
  const webm = join(VIDEO_DIR, files[0]);
  const mp4 = join(OUT_DIR, "pubfy-dashboard-demo-youtube-final.mp4");

  execSync(
    `ffmpeg -y -i "${webm}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "${mp4}"`,
    { stdio: "inherit" },
  );

  console.log(`Vídeo salvo em: ${mp4}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
