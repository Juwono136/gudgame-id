import fs from "node:fs";
import path from "node:path";
import type postgres from "postgres";

const UUID_DEFAULTS_SQL = path.join(
  process.cwd(),
  "db",
  "migrations",
  "0027_uuid_pk_defaults.sql",
);

/**
 * Always re-apply UUID PK defaults after migrate/baseline.
 * Migration 0004/0005 dropped serial sequences without restoring
 * `DEFAULT gen_random_uuid()` on several tables — inserts then fail with NOT NULL.
 * Running this every deploy is idempotent and protects the baseline path
 * (which records journal hashes without executing SQL).
 */
export async function ensureUuidPkDefaults(client: postgres.Sql): Promise<void> {
  if (!fs.existsSync(UUID_DEFAULTS_SQL)) {
    console.warn("[db-migrate] 0027_uuid_pk_defaults.sql missing — skipping UUID default repair.");
    return;
  }

  const sql = fs.readFileSync(UUID_DEFAULTS_SQL, "utf8");
  console.log("[db-migrate] Ensuring UUID primary-key defaults (idempotent)…");
  await client.unsafe(sql);
  console.log("[db-migrate] UUID primary-key defaults OK.");
}
