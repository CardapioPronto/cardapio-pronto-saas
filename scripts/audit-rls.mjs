#!/usr/bin/env node
/**
 * scripts/audit-rls.mjs
 *
 * Audita o estado de RLS no banco real. Use após aplicar a migration
 * 20260515090000_ensure_rls_on_core_tables.sql para validar que todas
 * as tabelas críticas têm RLS habilitado e política mínima cadastrada.
 *
 * Uso:
 *   node scripts/audit-rls.mjs
 *
 * Requer variáveis de ambiente (settar no shell antes de rodar):
 *   SUPABASE_URL                Project URL (https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY   Service role key (NUNCA commitar)
 *
 * Consulta apenas `public.rls_audit_report` via PostgREST (HTTP). Não usa
 * @supabase/supabase-js nem Realtime/WebSocket — evita erro em Node 20 onde
 * o cliente JS exige pacote opcional `ws`.
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.\n" +
      "Use os valores em Supabase Dashboard > Project Settings > API.",
  );
  process.exit(1);
}

/**
 * Lista de relações públicas obrigatórias para SaaS produtivo (multi-tenant).
 * Nota: `restaurant_delivery_config` não existe no schema atual — dados de delivery
 * ficam em `restaurant_settings` com `setting_key = 'delivery_config'`.
 */
const REQUIRED_TABLES = [
  "orders",
  "order_items",
  "order_payments",
  "products",
  "categories",
  "mesas",
  "areas",
  "subscriptions",
  "plans",
  "users",
  "system_admins",
  "restaurants",
  "restaurant_settings",
  "restaurant_payment_settings",
  "restaurant_email_contacts",
  "email_settings",
  "coupons",
  "coupon_usage",
  "promotions",
  "pagarme_webhook_events",
  "email_send_logs",
  "email_webhook_events",
  "email_campaigns",
];

/** Tabelas internas só acessadas via SECURITY DEFINER/service_role sem políticas. */
const TABLES_ALLOW_FORCE_RLS_WITHOUT_POLICIES = new Set(["public_rate_limit_buckets"]);

function auditPass(row) {
  if (!(row.rls_enabled && row.rls_forced)) return false;
  if (TABLES_ALLOW_FORCE_RLS_WITHOUT_POLICIES.has(row.table_name)) return true;
  return Number(row.policy_count) > 0;
}

async function fetchRlsReport() {
  const base = supabaseUrl.replace(/\/$/, "");
  const url = `${base}/rest/v1/rls_audit_report?select=*&order=table_name.asc`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const { ok, status, data } = await fetchRlsReport();

  if (!ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : String(data);
    console.error(
      `Falha ao consultar rls_audit_report (HTTP ${status}): ${msg}`,
    );
    process.exit(2);
  }

  if (!Array.isArray(data)) {
    console.error("Resposta inesperada (esperado array JSON):", data);
    process.exit(2);
  }

  const byName = new Map(data.map((row) => [row.table_name, row]));
  const missing = REQUIRED_TABLES.filter((name) => !byName.has(name));
  const failures = [];

  console.log("table_name | rls_enabled | rls_forced | policy_count");
  console.log("-".repeat(70));

  for (const row of data) {
    const flag = auditPass(row) ? "PASS" : "WARN";
    if (!auditPass(row) && REQUIRED_TABLES.includes(row.table_name)) {
      failures.push(row);
    }
    console.log(
      `${flag} ${row.table_name.padEnd(36)} ${String(row.rls_enabled).padEnd(11)} ${String(row.rls_forced).padEnd(10)} ${row.policy_count}`,
    );
  }

  if (missing.length > 0) {
    console.error("\nTabelas obrigatórias ausentes:");
    for (const name of missing) console.error(`  - ${name}`);
  }

  if (failures.length > 0) {
    console.error("\nTabelas com RLS incompleto:");
    for (const row of failures) {
      console.error(
        `  - ${row.table_name} (rls=${row.rls_enabled} forced=${row.rls_forced} policies=${row.policy_count})`,
      );
    }
  }

  if (missing.length === 0 && failures.length === 0) {
    console.log("\nRLS audit OK. Tabelas críticas ok (ENABLE + FORCE; políticas onde necessário).");
  } else {
    process.exit(3);
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(255);
});
