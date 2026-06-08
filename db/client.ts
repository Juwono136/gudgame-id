import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { getServerEnv } from "@/lib/config/env.server";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

const log = logger.child({ module: "database" });

const DB_SQL_KEY = "__courtPediaDbSql" as const;
const DB_DRIZZLE_KEY = "__courtPediaDbDrizzle" as const;

type DbGlobal = {
  [DB_SQL_KEY]?: Sql;
  [DB_DRIZZLE_KEY]?: PostgresJsDatabase<typeof schema>;
};

const globalForDb = globalThis as unknown as DbGlobal;

function createQueryClient(): Sql {
  const { DATABASE_URL } = getServerEnv();

  return postgres(DATABASE_URL, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!globalForDb[DB_DRIZZLE_KEY]) {
    const sql = createQueryClient();
    globalForDb[DB_SQL_KEY] = sql;
    globalForDb[DB_DRIZZLE_KEY] = drizzle(sql, { schema });
    log.debug("Database client initialized");
  }
  return globalForDb[DB_DRIZZLE_KEY];
}

export async function pingDatabase(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const sql = globalForDb[DB_SQL_KEY] ?? createQueryClient();
    await sql`SELECT 1`;
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("Database ping failed", { error: message });
    return { ok: false, error: message };
  }
}

export async function closeDatabase(): Promise<void> {
  const sql = globalForDb[DB_SQL_KEY];
  if (sql) {
    await sql.end({ timeout: 5 });
    delete globalForDb[DB_SQL_KEY];
    delete globalForDb[DB_DRIZZLE_KEY];
    log.info("Database connection closed");
  }
}
