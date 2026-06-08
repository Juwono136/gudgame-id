import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDatabase, getDb } from "./client";
import { user } from "./schema/auth";
import { userRoleAssignments } from "./schema/roles";
import { sports } from "./schema";
import {
  normalizeLegacyRole,
  type AppRole,
} from "@/lib/roles/constants";
import { setUserRoles } from "@/lib/roles/sync";
import { ensureStorageBucket } from "@/lib/storage";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "db:seed" });

const MVP_SPORTS = [
  { name: "Padel", slug: "padel" },
] as const;

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

export async function seedDatabase() {
  const db = getDb();

  for (const sport of MVP_SPORTS) {
    const existing = await db
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, sport.slug))
      .limit(1);

    if (existing.length > 0) {
      log.info("Sport already seeded", { slug: sport.slug });
      continue;
    }

    await db.insert(sports).values({
      name: sport.name,
      slug: sport.slug,
      displayOrder: 0,
      isActive: true,
    });
    log.info("Sport seeded", { slug: sport.slug });
  }
}

async function main() {
  log.info("Starting database seed");
  await seedDatabase();
  await syncLegacyUserRoles();

  try {
    await ensureStorageBucket();
    log.info("Storage bucket ready");
  } catch (err) {
    log.warn("Storage bucket setup skipped or failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  await closeDatabase();
  log.info("Seed completed");
}

main().catch((err) => {
  log.error("Seed failed", err);
  process.exit(1);
});
