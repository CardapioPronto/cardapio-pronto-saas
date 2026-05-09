import { readFileSync } from "node:fs";

const checks = [];

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function check(name, condition, detail) {
  checks.push({ name, passed: Boolean(condition), detail });
}

function functionBlock(config, functionName) {
  const pattern = new RegExp(`\\[functions\\.${functionName}\\]\\s+verify_jwt\\s*=\\s*(true|false)`, "m");
  return config.match(pattern)?.[1] ?? null;
}

function authEmailConfirmationsEnabled(config) {
  return /\[auth\.email\][\s\S]*?enable_confirmations\s*=\s*true[\s\S]*?\[auth\.sms\]/m.test(config);
}

const config = read("supabase/config.toml");
const packageJson = read("package.json");
const envExample = read(".env.example");
const cadastro = read("src/pages/Cadastro.tsx");
const createEmployee = read("supabase/functions/create-employee/index.ts");
const finalizeOwnerSignup = read("supabase/functions/finalize-owner-signup/index.ts");
const cleanupOwnerSignups = read("supabase/functions/cleanup-unverified-owner-signups/index.ts");
const checkoutMigration = read("supabase/migrations/20260507123000_harden_public_menu_order_integrity.sql");
const mainLayout = read("src/layouts/MainLayout.tsx");
const supabaseClient = read("src/integrations/supabase/client.ts");
const userSession = read("src/hooks/useUserSession.ts");
const app = read("src/App.tsx");
const main = read("src/main.tsx");
const errorBoundary = read("src/components/ErrorBoundary.tsx");
const frontendObservability = read("src/lib/observability.ts");
const edgeObservability = read("supabase/functions/_shared/observability.ts");
const demonstracao = read("src/pages/Demonstracao.tsx");
const adminPagarme = read("src/pages/admin/AdminPagarme.tsx");
const adminPagarmeWebhooks = read("src/pages/admin/AdminPagarmeWebhooks.tsx");
const resendWebhook = read("supabase/functions/resend-webhook/index.ts");

for (const functionName of [
  "create-storage-buckets",
  "generate-ai-response",
  "seed-blog-posts",
  "send-contact-email",
  "email-dispatch",
  "create-employee",
  "create-trial-subscription",
  "finalize-owner-signup",
  "pagarme-create-order-payment",
  "send-delivery-whatsapp",
]) {
  check(
    `Edge function ${functionName} requires a JWT`,
    functionBlock(config, functionName) === "true",
    `${functionName} should not be anonymously callable without a Supabase JWT`,
  );
}

check(
  "Owner signup requires email confirmation",
  authEmailConfirmationsEnabled(config),
  "owner account creation must not be immediately active without email verification",
);

check(
  "Owner signup form does not create restaurant before verification",
  cadastro.includes("signup_intent: \"owner_signup\"")
    && cadastro.includes("pending_restaurant")
    && !cadastro.includes(".from(\"restaurants\")")
    && !cadastro.includes("createTrialSubscription"),
  "Cadastro should store pending metadata only; final creation must happen after confirmed email",
);

check(
  "Verified owner signup is finalized server-side",
  userSession.includes("finalizeOwnerSignupIfNeeded")
    && finalizeOwnerSignup.includes("email_confirmed_at")
    && finalizeOwnerSignup.includes("ensureTrialSubscription")
    && finalizeOwnerSignup.includes("upsert"),
  "finalize-owner-signup must create the restaurant/trial only after a confirmed authenticated owner session",
);

check(
  "Expired unverified owner signups can be cleaned safely",
  functionBlock(config, "cleanup-unverified-owner-signups") === "false"
    && cleanupOwnerSignups.includes("OWNER_SIGNUP_CLEANUP_SECRET")
    && cleanupOwnerSignups.includes("signup_intent !== \"owner_signup\"")
    && cleanupOwnerSignups.includes("auth.admin.deleteUser"),
  "cleanup-unverified-owner-signups should require an internal secret and only delete expired pending owner signups",
);

check(
  "Front-end observability is wired",
  packageJson.includes("\"@sentry/react\"")
    && main.includes("initObservability()")
    && app.includes("<ErrorBoundary>")
    && app.includes("QueryCache")
    && errorBoundary.includes("captureException(error")
    && frontendObservability.includes("VITE_SENTRY_DSN")
    && frontendObservability.includes("ingest.us.sentry.io"),
  "React errors and query/mutation failures should be captured by Sentry when VITE_SENTRY_DSN is configured",
);

check(
  "Edge function observability is wired",
  edgeObservability.includes("SENTRY_DSN")
    && edgeObservability.includes("application/x-sentry-envelope")
    && [
      "create-employee",
      "create-trial-subscription",
      "finalize-owner-signup",
      "cleanup-unverified-owner-signups",
      "pagarme-create-order-payment",
      "send-delivery-whatsapp",
      "email-dispatch",
      "send-contact-email",
    ].every((functionName) => read(`supabase/functions/${functionName}/index.ts`).includes("captureEdgeException")),
  "critical Edge Functions should capture unhandled failures with the shared observability helper",
);

check(
  "Observability environment variables are documented",
  envExample.includes("VITE_SENTRY_DSN")
    && envExample.includes("SENTRY_DSN")
    && envExample.includes("SENTRY_ENVIRONMENT")
    && envExample.includes("SENTRY_RELEASE"),
  "front-end and Edge Function Sentry DSNs must be documented for production setup",
);

check(
  "Critical Edge Function secrets are documented",
  [
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAGARME_SECRET_KEY",
    "PAGARME_WEBHOOK_SECRET",
    "PAGARME_PLATFORM_RECIPIENT_ID",
    "RESEND_API_KEY",
    "RESEND_WEBHOOK_SECRET",
    "EVOLUTION_API_URL",
    "EVOLUTION_API_KEY",
    "N8N_WEBHOOK_URL",
    "N8N_INTERNAL_API_KEY",
    "GROQ_API_KEY",
    "PUBLIC_SITE_URL",
  ].every((envName) => envExample.includes(envName)),
  "production secrets used by Edge Functions should be visible in .env.example without real values",
);

check(
  "Resend webhook fails closed without a signing secret",
  resendWebhook.includes("RESEND_WEBHOOK_SECRET")
    && resendWebhook.includes("Webhook secret not configured")
    && !resendWebhook.includes("payload = JSON.parse(rawBody);"),
  "resend-webhook must not accept unsigned payloads when RESEND_WEBHOOK_SECRET is missing",
);

check(
  "Demo request email uses configured Supabase function invocation",
  demonstracao.includes('supabase.functions.invoke("send-contact-email"')
    && !demonstracao.includes("send-email")
    && !demonstracao.includes("jyrfjvyeikhqpuwcvdff.supabase.co"),
  "Demonstracao should not call a hardcoded/nonexistent Edge Function URL",
);

check(
  "Admin Pagar.me webhook URLs derive from the configured Supabase URL",
  [adminPagarme, adminPagarmeWebhooks].every((source) =>
    source.includes("import.meta.env.VITE_SUPABASE_URL")
      && !source.includes("jyrfjvyeikhqpuwcvdff.supabase.co")
  ),
  "admin webhook copy fields must work across Supabase projects/environments",
);

check(
  "Employee creation uses authenticated caller as creator",
  createEmployee.includes("created_by: caller.id") && createEmployee.includes("getCaller(req, supabaseAdmin)"),
  "create-employee must not trust created_by from the request body",
);

check(
  "Employee creation checks restaurant authorization",
  createEmployee.includes("getCallerAccess") && createEmployee.includes("Sem permissão para criar funcionários"),
  "create-employee must validate restaurant ownership/employee permissions",
);

check(
  "Public checkout does not trust client delivery fee",
  !checkoutMigration.includes("payload->>'delivery_fee'") && checkoutMigration.includes("v_delivery_fee := GREATEST"),
  "delivery fee must be calculated from restaurant settings on the server",
);

check(
  "Public checkout validates tracking-sensitive payment settings",
  checkoutMigration.includes("restaurant_payment_settings") && checkoutMigration.includes("Pagamento online indisponível"),
  "online payment availability must be enforced server-side",
);

check(
  "Subscription gate is mounted in the protected layout",
  mainLayout.includes("SubscriptionBlocker") && mainLayout.includes("bypassSubscriptionGate"),
  "protected app routes should block expired/no-plan restaurants except the subscription page",
);

check(
  "Subscription gate uses a minimal entitlement RPC",
  checkoutMigration.includes("get_restaurant_subscription_entitlement")
    && read("src/hooks/useSubscriptionStatus.ts").includes("get_restaurant_subscription_entitlement"),
  "employees need a safe subscription entitlement lookup that does not expose the subscriptions table",
);

check(
  "Supabase client uses environment variables",
  supabaseClient.includes("import.meta.env.VITE_SUPABASE_URL")
    && supabaseClient.includes("import.meta.env.VITE_SUPABASE_ANON_KEY")
    && !supabaseClient.includes("jyrfjvyeikhqpuwcvdff.supabase.co"),
  "client configuration should not be hardcoded to one Supabase project",
);

const failed = checks.filter((item) => !item.passed);

for (const item of checks) {
  const status = item.passed ? "PASS" : "FAIL";
  console.log(`${status} ${item.name}`);
  if (!item.passed) console.log(`  ${item.detail}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} production preflight check(s) failed.`);
  process.exit(1);
}

console.log("\nProduction preflight checks passed.");
