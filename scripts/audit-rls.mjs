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
 * O service role bypassa RLS e consegue ler `pg_policies` via PostgREST?
 * Não — então este script chama a view `public.rls_audit_report` criada
 * pela migration, que é segura para inspecionar via PostgREST.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.\n" +
      "Use os valores em Supabase Dashboard > Project Settings > API.",
  );
  process.exit(1);
}

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
  "restaurant_delivery_config",
  "restaurant_email_contacts",
  "coupons",
  "coupon_usage",
  "promotions",
  "pagarme_webhook_events",
  "email_send_logs",
  "email_webhook_events",
  "email_campaigns",
];

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await client
    .from("rls_audit_report")
    .select("*")
    .order("table_name");

  if (error) {
    console.error("Falha ao consultar rls_audit_report:", error.message);
    process.exit(2);
  }

  const byName = new Map(data.map((row) => [row.table_name, row]));
  const missing = REQUIRED_TABLES.filter((name) => !byName.has(name));
  const failures = [];

  console.log("table_name | rls_enabled | rls_forced | policy_count");
  console.log("-".repeat(70));

  for (const row of data) {
    const flag = row.rls_enabled && row.rls_forced && row.policy_count > 0
      ? "PASS"
      : "WARN";
    if (flag === "WARN" && REQUIRED_TABLES.includes(row.table_name)) {
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
    console.log("\nRLS audit OK. Todas as tabelas críticas habilitadas e com políticas.");
  } else {
    process.exit(3);
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(255);
});
