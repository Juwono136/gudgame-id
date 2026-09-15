/**
 * Production DB schema sync for Docker / CI deploy.
 *
 * - Validates DATABASE_URL and tests connectivity (clear errors; drizzle-kit hides failures).
 * - Baselines existing push-created schemas by recording migrations without re-running CREATE TABLE.
 * - Applies pending SQL migrations via drizzle-orm migrator.
 * - Always repairs UUID PK defaults (idempotent) so baseline cannot leave broken inserts.
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { ensureMigrationPrerequisites } from "./ensure-migration-prerequisites";
import { ensureUuidPkDefaults } from "./ensure-uuid-pk-defaults";
import {
  CANONICAL_DB_NAME,
  maskDatabaseUrl,
  normalizeDockerDatabaseUrl,
} from "@/lib/db/normalize-docker-database-url";

const MIGRATIONS_FOLDER = path.join(process.cwd(), "db", "migrations");
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

function requireDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    console.error(
      "[db-migrate] DATABASE_URL is not set. For Docker on VPS use the postgres service hostname, e.g.\n" +
        `  postgresql://user:pass@postgres:5432/${CANONICAL_DB_NAME}`,
    );
    process.exit(1);
  }

  return normalizeDockerDatabaseUrl(raw, { fatalOnLocalhost: true });
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
      "Prerequisites + UUID PK defaults are still applied explicitly after baseline.",
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

async function verifyCriticalSchema(client: postgres.Sql): Promise<void> {
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

  const [wikiId] = await client<{ data_type: string; column_default: string | null }[]>`
    SELECT data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wiki_entities'
      AND column_name = 'id'
  `;

  if (!wikiId) {
    console.error("[db-migrate] Post-migrate check failed: wiki_entities.id is missing.");
    process.exit(1);
  }

  if (wikiId.data_type !== "uuid") {
    console.error(
      `[db-migrate] Post-migrate check failed: wiki_entities.id must be uuid (got ${wikiId.data_type}).`,
    );
    process.exit(1);
  }

  const def = wikiId.column_default ?? "";
  if (!/gen_random_uuid|uuid_generate/i.test(def)) {
    console.error(
      `[db-migrate] Post-migrate check failed: wiki_entities.id lacks gen_random_uuid() default (got: ${def || "NULL"}).`,
    );
    process.exit(1);
  }

  const [groups] = await client<{ ok: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tournament_group_matches'
    ) AS ok
  `;
  if (!groups?.ok) {
    console.error(
      "[db-migrate] Post-migrate check failed: tournament_group_matches is missing (journal must include 0012).",
    );
    process.exit(1);
  }

  console.log(
    "[db-migrate] Post-migrate checks passed (host_bank_accounts + wiki_entities.id + tournament_group_matches).",
  );
}

async function finalizeSchema(client: postgres.Sql): Promise<void> {
  await ensureUuidPkDefaults(client);
  await verifyCriticalSchema(client);
}

async function main(): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  console.log(`[db-migrate] Target: ${maskDatabaseUrl(databaseUrl)}`);
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

    console.log(
      `[db-migrate] Schema state: appTables=${appTablesExist} appliedMigrations=${appliedCount}`,
    );

    if (appTablesExist && appliedCount === 0) {
      await baselineExistingSchema(client);
      await finalizeSchema(client);
      console.log("[db-migrate] Baseline path complete.");
      return;
    }

    await ensureMigrationPrerequisites(client);

    console.log("[db-migrate] Applying pending migrations from db/migrations …");
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    await finalizeSchema(client);
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
