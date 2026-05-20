/**
 * Smoke checks for Pagar.me homologation (no secrets required for basic checks).
 *
 * Usage:
 *   npm run pagarme:smoke-homolog
 *   WEBHOOK_URL=https://xxx.supabase.co/functions/v1/pagarme-webhook npm run pagarme:smoke-homolog
 */

const WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  "https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/pagarme-webhook";

const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail });
}

async function webhookRejectsUnsigned() {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "charge.paid", data: { id: "smoke_test" } }),
    });
    const body = await res.text();
    check(
      "Webhook rejeita payload sem assinatura (401)",
      res.status === 401,
      `status=${res.status} body=${body.slice(0, 120)}`,
    );
  } catch (error) {
    check(
      "Webhook rejeita payload sem assinatura (401)",
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function checkRepoFiles() {
  const fs = await import("node:fs");
  const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  check(
    "Edge compartilhada mapPagarmeSubscriptionStatus",
    read("supabase/functions/_shared/pagarme-subscription-status.ts").includes("pending"),
    "supabase/functions/_shared/pagarme-subscription-status.ts",
  );
  check(
    "Edge aceita payment_method pix",
    read("supabase/functions/pagarme-create-boleto-pix/index.ts").includes('"pix"'),
    "pagarme-create-boleto-pix",
  );
  check(
    "Migration pending visibility",
    fs.existsSync(new URL("../supabase/migrations/20260519143000_subscription_pending_visibility.sql", import.meta.url)),
    "20260519143000_subscription_pending_visibility.sql",
  );
  check(
    "UI PixPaymentConfirmation",
    fs.existsSync(new URL("../src/components/payment/PixPaymentConfirmation.tsx", import.meta.url)),
    "PixPaymentConfirmation.tsx",
  );
}

await webhookRejectsUnsigned();
await checkRepoFiles();

const failed = checks.filter((c) => !c.passed);
for (const c of checks) {
  console.log(`${c.passed ? "OK" : "FAIL"}  ${c.name}`);
  if (!c.passed) console.log(`     ${c.detail}`);
}

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} homologation smoke checks passed.`);
