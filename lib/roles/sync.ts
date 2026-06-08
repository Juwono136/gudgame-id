import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { userRoleAssignments } from "@/db/schema/roles";
import {
  DEFAULT_REGISTRATION_ROLES,
  normalizeLegacyRole,
  pickPrimaryRole,
  type AppRole,
} from "@/lib/roles/constants";

export async function getUserRoleAssignments(userId: string): Promise<AppRole[]> {
  const db = getDb();
  const rows = await db
    .select({ role: userRoleAssignments.role })
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.userId, userId));

  const roles: AppRole[] = [];
  for (const row of rows) {
    const normalized = normalizeLegacyRole(row.role);
    if (normalized) roles.push(normalized);
  }

  if (roles.length > 0) return [...new Set(roles)];

  const [legacy] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const fallback = normalizeLegacyRole(legacy?.role) ?? "player";
  await setUserRoles(userId, [fallback]);
  return [fallback];
}

export async function setUserRoles(
  userId: string,
  roles: AppRole[],
  assignedBy?: string,
): Promise<AppRole[]> {
  const db = getDb();
  const unique = [...new Set(roles.length > 0 ? roles : DEFAULT_REGISTRATION_ROLES)];

  await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));

  if (unique.length > 0) {
    await db.insert(userRoleAssignments).values(
      unique.map((role) => ({
        id: randomUUID(),
        userId,
        role,
        assignedBy: assignedBy ?? null,
      })),
    );
  }

  const primary = pickPrimaryRole(unique);
  await db
    .update(user)
    .set({ role: primary, updatedAt: new Date() })
    .where(eq(user.id, userId));

  return unique;
}

export async function ensureDefaultPlayerRole(userId: string): Promise<void> {
  const existing = await getUserRoleAssignments(userId);
  if (existing.length === 0) {
    await setUserRoles(userId, DEFAULT_REGISTRATION_ROLES);
  }
}
