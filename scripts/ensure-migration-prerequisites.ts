import fs from "node:fs";
import path from "node:path";
import type postgres from "postgres";

const PREREQUISITES_SQL = path.join(
  process.cwd(),
  "db",
  "migrations",
  "prerequisites",
  "ensure-host-payout-prerequisites.sql",
);

/**
 * Applies idempotent SQL for migrations 0002/0003 before drizzle migrate.
 * Fixes VPS deploys where __drizzle_migrations was baselined without creating host_bank_accounts.
 */
export async function ensureMigrationPrerequisites(client: postgres.Sql): Promise<void> {
  if (!fs.existsSync(PREREQUISITES_SQL)) {
    console.log("[db-migrate] No prerequisite SQL file — skipping.");
    return;
  }

  const sql = fs.readFileSync(PREREQUISITES_SQL, "utf8");
  console.log("[db-migrate] Ensuring host payout prerequisites (0002/0003)...");
  await client.unsafe(sql);
  console.log("[db-migrate] Prerequisites OK.");
}
