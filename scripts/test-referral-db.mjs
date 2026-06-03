#!/usr/bin/env node
/**
 * Roda supabase/tests/referral_program_rpcs.sql no Postgres local/remoto.
 * Requer DATABASE_URL (ex.: supabase start → connection string).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlFile = path.join(root, "supabase/tests/referral_program_rpcs.sql");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Defina DATABASE_URL (Postgres do Supabase local ou remoto).");
  process.exit(1);
}

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
