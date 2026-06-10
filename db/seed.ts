/** Seed/migrate scripts only need DATABASE_URL — not full production env (Redis, etc.). */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDatabase, getDb } from "./client";
import { user } from "./schema/auth";
import { userRoleAssignments } from "./schema/roles";
import { sports } from "./schema";
import { DEFAULT_SPORT_SEEDS } from "@/lib/sports/default-sport-data";
import {
  normalizeLegacyRole,
  type AppRole,
} from "@/lib/roles/constants";
import { migrateContributorRoleToHost } from "@/lib/roles/migrate-host-role";
import { setUserRoles } from "@/lib/roles/sync";
import { ensureStorageBucket } from "@/lib/storage/client";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "db:seed" });

/** Backfill user_role_assignments from legacy user.role column */
export async function syncLegacyUserRoles() {
  const db = getDb();
  const users = await db.select({ id: user.id, role: user.role }).from(user);

  for (const row of users) {
    const [existing] = await db
      .select({ id: userRoleAssignments.id })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.userId, row.id))
      .limit(1);

    if (existing) continue;

    const role: AppRole = normalizeLegacyRole(row.role) ?? "player";
    await setUserRoles(row.id, [role]);
    log.info("Synced legacy role", { userId: row.id, role });
  }
}

export async function isSportsSeedComplete(): Promise<boolean> {
  const db = getDb();

  for (const sport of DEFAULT_SPORT_SEEDS) {
    const [existing] = await db
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, sport.slug))
      .limit(1);

    if (!existing) return false;
  }

  return DEFAULT_SPORT_SEEDS.length > 0;
}

/** @returns true when new sport rows were inserted */
export async function seedDatabase(): Promise<boolean> {
  if (await isSportsSeedComplete()) {
    log.info("Sports seed already complete — skipping");
    return false;
  }

  const db = getDb();
  let inserted = false;

  for (const sport of DEFAULT_SPORT_SEEDS) {
    const [existing] = await db
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, sport.slug))
      .limit(1);

    if (existing) continue;

    await db.insert(sports).values({
      name: sport.name,
      slug: sport.slug,
      visibility: sport.visibility,
      tagline: sport.tagline,
      description: sport.description,
      isActive: true,
    });
    inserted = true;
    log.info("Sport seeded", { slug: sport.slug });
  }

  return inserted;
}

async function main() {
  log.info("Starting database seed");

  const insertedSports = await seedDatabase();

  if (!insertedSports && (await isSportsSeedComplete())) {
    log.info("Default data already present — running lightweight role backfill only");
  }

  await syncLegacyUserRoles();
  await migrateContributorRoleToHost();

  if (insertedSports) {
    try {
      await ensureStorageBucket();
      log.info("Storage bucket ready");
    } catch (err) {
      log.warn("Storage bucket setup skipped or failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await closeDatabase();
  log.info("Seed completed");
}

main().catch((err) => {
  log.error("Seed failed", err);
  process.exit(1);
});
