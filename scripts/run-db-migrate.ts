/**
 * Production DB schema sync for Docker / CI deploy.
 *
 * - Validates DATABASE_URL and tests connectivity (clear errors; drizzle-kit hides failures).
 * - Baselines existing push-created schemas by recording migrations without re-running CREATE TABLE.
 * - Applies pending SQL migrations via drizzle-orm migrator.
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { ensureMigrationPrerequisites } from "./ensure-migration-prerequisites";

const MIGRATIONS_FOLDER = path.join(process.cwd(), "db", "migrations");
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<invalid DATABASE_URL>";
  }
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(
      "[db-migrate] DATABASE_URL is not set. For Docker on VPS use the postgres service hostname, e.g.\n" +
        "  postgresql://user:pass@postgres:5432/tanding_db",
    );
    process.exit(1);
  }

  if (
    fs.existsSync("/.dockerenv") &&
    (url.includes("@127.0.0.1") ||
      url.includes("@localhost") ||
      url.includes("://127.0.0.1") ||
      url.includes("://localhost"))
  ) {
    console.error(
      "[db-migrate] DATABASE_URL points to localhost inside a container — use Docker DNS hostname `postgres` instead.\n" +
        `  Current (masked): ${maskDatabaseUrl(url)}`,
    );
    process.exit(1);
  }

  return url;
}

async function assertDatabaseReachable(databaseUrl: string): Promise<postgres.Sql> {
  const client = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
    prepare: false,
  });

  try {
    await client`SELECT 1`;
    console.log(`[db-migrate] Database reachable (${maskDatabaseUrl(databaseUrl)})`);
    return client;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[db-migrate] Cannot connect to database: ${message}\n` +
        "  Check gudgame-postgres is healthy, credentials match POSTGRESQL_*, and both containers share network `tunnel`.",
    );
    await client.end({ timeout: 1 }).catch(() => undefined);
    process.exit(1);
  }
}

async function hasApplicationTables(client: postgres.Sql): Promise<boolean> {
  const rows = await client<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user'
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function getAppliedMigrationCount(client: postgres.Sql): Promise<number> {
  const rows = await client<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = ${MIGRATIONS_SCHEMA}
      AND table_name = ${MIGRATIONS_TABLE}
  `;

  if (rows[0]?.count !== "1") return 0;

  const applied = await client<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM drizzle.__drizzle_migrations
  `;
  return Number(applied[0]?.count ?? 0);
}

async function baselineExistingSchema(client: postgres.Sql): Promise<void> {
  if (!fs.existsSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"))) {
    console.error(
      `[db-migrate] No migration journal at db/migrations/meta/_journal.json — run npm run db:generate locally and commit.`,
    );
    process.exit(1);
  }

  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  if (migrations.length === 0) {
    console.log("[db-migrate] No migration files to baseline.");
    return;
  }

  console.log(
    `[db-migrate] Existing public schema detected with no applied migrations — baselining ${migrations.length} migration(s).`,
  );
  console.warn(
    "[db-migrate] Baselining records migrations as applied without re-running SQL. " +
      "Prerequisite tables (host_bank_accounts, etc.) are ensured separately.",
  );

  await ensureMigrationPrerequisites(client);

  await client`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  for (const migration of migrations) {
    await client`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${migration.hash}, ${migration.folderMillis})
    `;
  }

  console.log("[db-migrate] Baseline complete — future deploys will apply only new migrations.");
}

async function verifyCriticalTables(client: postgres.Sql): Promise<void> {
  const [hostBanks] = await client<{ ok: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'host_bank_accounts'
    ) AS ok
  `;

  if (!hostBanks?.ok) {
    console.error(
      "[db-migrate] Post-migrate check failed: host_bank_accounts table is missing.",
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  const client = await assertDatabaseReachable(databaseUrl);

  try {
    const journalPath = path.join(MIGRATIONS_FOLDER, "meta", "_journal.json");
    if (!fs.existsSync(journalPath)) {
      console.error(
        "[db-migrate] Missing db/migrations — commit generated migrations or run: npm run db:generate",
      );
      process.exit(1);
    }

    const [appTablesExist, appliedCount] = await Promise.all([
      hasApplicationTables(client),
      getAppliedMigrationCount(client),
    ]);

    if (appTablesExist && appliedCount === 0) {
      await baselineExistingSchema(client);
      return;
    }

    await ensureMigrationPrerequisites(client);

    console.log("[db-migrate] Applying pending migrations...");
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    await verifyCriticalTables(client);
    console.log("[db-migrate] Migrations applied successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : null;

    console.error("[db-migrate] Migration failed:", cause ?? message);
    if (cause && cause !== message) {
      console.error("[db-migrate] Details:", message);
    }
    process.exit(1);
  } finally {
    await client.end({ timeout: 5 });
  }
}

void main();
