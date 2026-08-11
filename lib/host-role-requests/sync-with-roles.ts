import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { hostRoleRequests } from "@/db/schema/host-role-requests";
import { userRoleAssignments } from "@/db/schema/roles";
import { notifyUserHostRoleRequestApproved } from "@/lib/host-role-requests/notify";
import { logger } from "@/lib/logger";
import type { AppRole } from "@/lib/roles/constants";
import { getUserRoleAssignments } from "@/lib/roles/sync";

const log = logger.child({ module: "host-role-request-sync" });

/**
 * Keep host_role_requests in sync when roles change via User Management
 * (or any path that calls setUserRoles outside the Host requests approve flow).
 *
 * - Host newly granted → auto-approve any pending request + notify user
 * - Host removed → cancel pending + revoke approved requests
 */
export async function syncHostRoleRequestsAfterRoleChange(input: {
  userId: string;
  previousRoles: AppRole[];
  nextRoles: AppRole[];
  assignedBy: string;
}): Promise<void> {
  const hadHost =
    input.previousRoles.includes("host") || input.previousRoles.includes("super_admin");
  const hasHost =
    input.nextRoles.includes("host") || input.nextRoles.includes("super_admin");

  try {
    if (!hadHost && hasHost) {
      await autoApprovePendingHostRequests(input.userId, input.assignedBy, {
        notify: true,
      });
      return;
    }

    if (hadHost && !hasHost) {
      await clearHostRequestsAfterRoleRemoved(input.userId, input.assignedBy);
    }
  } catch (error) {
    log.error("Failed to sync host role requests after role change", {
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read-path reconcile so Settings → Roles always matches current roles + admin decisions.
 * Does not send emails (avoids spam when the user refreshes the page).
 */
export async function reconcileHostRoleRequestsForUser(userId: string): Promise<void> {
  const roles = await getUserRoleAssignments(userId);
  const hasHost = roles.includes("host") || roles.includes("super_admin");

  try {
    if (hasHost) {
      // Role already granted — pending must not linger as "awaiting review".
      await autoApprovePendingHostRequests(userId, userId, { notify: false });
      return;
    }

    // Host removed / never granted — approved rows must not stay "approved".
    await reconcileApprovedHostRequestsWithoutRole(userId);
  } catch (error) {
    log.error("Failed to reconcile host role requests for user", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function autoApprovePendingHostRequests(
  userId: string,
  assignedBy: string,
  options?: { notify?: boolean },
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const notify = options?.notify !== false;

  const updated = await db
    .update(hostRoleRequests)
    .set({
      status: "approved",
      rejectionReason: null,
      reviewedByUserId: assignedBy,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(hostRoleRequests.userId, userId), eq(hostRoleRequests.status, "pending")),
    )
    .returning({ id: hostRoleRequests.id });

  if (updated.length === 0) return;

  log.info("Auto-approved pending host role request(s) after role grant", {
    userId,
    count: updated.length,
    assignedBy,
    notify,
  });

  if (!notify) return;

  const [account] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!account?.email) return;

  void notifyUserHostRoleRequestApproved({
    userId: account.id,
    email: account.email,
    userName: account.name,
  });
}

/**
 * When Host is removed in User Management:
 * - pending → cancelled (user can submit a fresh request)
 * - approved → revoked (no longer shows as approved without Host access)
 */
async function clearHostRequestsAfterRoleRemoved(
  userId: string,
  assignedBy: string | null,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  const cancelled = await db
    .update(hostRoleRequests)
    .set({
      status: "cancelled",
      updatedAt: now,
    })
    .where(
      and(eq(hostRoleRequests.userId, userId), eq(hostRoleRequests.status, "pending")),
    )
    .returning({ id: hostRoleRequests.id });

  const revoked = await db
    .update(hostRoleRequests)
    .set({
      status: "revoked",
      reviewedByUserId: assignedBy,
      reviewedAt: now,
      updatedAt: now,
      rejectionReason: "Host role was removed by an administrator.",
    })
    .where(
      and(
        eq(hostRoleRequests.userId, userId),
        inArray(hostRoleRequests.status, ["approved"]),
      ),
    )
    .returning({ id: hostRoleRequests.id });

  if (cancelled.length > 0 || revoked.length > 0) {
    log.info("Synced host role requests after host role removed", {
      userId,
      cancelled: cancelled.length,
      revoked: revoked.length,
      assignedBy,
    });
  }
}

/**
 * Heal stale rows: status=approved but user no longer has Host/super_admin.
 */
export async function reconcileApprovedHostRequestsWithoutRole(
  userId?: string,
): Promise<number> {
  const db = getDb();
  const now = new Date();

  const approvedConditions = [eq(hostRoleRequests.status, "approved")];
  if (userId) {
    approvedConditions.push(eq(hostRoleRequests.userId, userId));
  }

  const approved = await db
    .select({
      id: hostRoleRequests.id,
      userId: hostRoleRequests.userId,
    })
    .from(hostRoleRequests)
    .where(and(...approvedConditions));

  if (approved.length === 0) return 0;

  const userIds = [...new Set(approved.map((row) => row.userId))];
  const holders = await db
    .select({ userId: userRoleAssignments.userId })
    .from(userRoleAssignments)
    .where(
      and(
        inArray(userRoleAssignments.userId, userIds),
        inArray(userRoleAssignments.role, ["host", "super_admin"]),
      ),
    );

  const holderSet = new Set(holders.map((row) => row.userId));
  const toRevokeIds = approved
    .filter((row) => !holderSet.has(row.userId))
    .map((row) => row.id);

  if (toRevokeIds.length === 0) return 0;

  await db
    .update(hostRoleRequests)
    .set({
      status: "revoked",
      rejectionReason: "Host role was removed by an administrator.",
      reviewedAt: now,
      updatedAt: now,
    })
    .where(inArray(hostRoleRequests.id, toRevokeIds));

  log.info("Reconciled approved host requests without Host role", {
    userId: userId ?? "all",
    count: toRevokeIds.length,
  });

  return toRevokeIds.length;
}
