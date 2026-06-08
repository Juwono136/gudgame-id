import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { userRoleAssignments } from "@/db/schema/roles";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "roles/migrate-host-role" });

const LEGACY_HOST_SLUGS = ["contributor", "editor", "moderator"] as const;

/**
 * Renames legacy contributor (and editor/moderator) role slugs to `host`
 * in user_role_assignments and the legacy user.role column.
 */
export async function migrateContributorRoleToHost(): Promise<void> {
  const db = getDb();

  const assignmentRows = await db
    .select({
      id: userRoleAssignments.id,
      role: userRoleAssignments.role,
    })
    .from(userRoleAssignments)
    .where(inArray(userRoleAssignments.role, [...LEGACY_HOST_SLUGS]));

  for (const row of assignmentRows) {
    await db
      .update(userRoleAssignments)
      .set({ role: "host" })
      .where(eq(userRoleAssignments.id, row.id));
  }

  if (assignmentRows.length > 0) {
    log.info("Migrated user_role_assignments to host", {
      count: assignmentRows.length,
    });
  }

  const legacyUsers = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(inArray(user.role, [...LEGACY_HOST_SLUGS]));

  for (const row of legacyUsers) {
    await db
      .update(user)
      .set({ role: "host", updatedAt: new Date() })
      .where(eq(user.id, row.id));
  }

  if (legacyUsers.length > 0) {
    log.info("Migrated user.role column to host", { count: legacyUsers.length });
  }
}
