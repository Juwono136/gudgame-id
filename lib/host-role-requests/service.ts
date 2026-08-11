import "server-only";

import { randomUUID } from "crypto";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  hostRoleRequests,
  type HostRoleRequest,
} from "@/db/schema/host-role-requests";
import type { HostRoleRequestStatus } from "@/lib/host-role-requests/constants";
import { userRoleAssignments } from "@/db/schema/roles";
import { AppError } from "@/lib/errors";
import {
  notifyAdminsHostRoleRequestSubmitted,
  notifyUserHostRoleRequestApproved,
  notifyUserHostRoleRequestRejected,
} from "@/lib/host-role-requests/notify";
import { logger } from "@/lib/logger";
import {
  DEFAULT_REGISTRATION_ROLES,
  normalizeLegacyRole,
  pickPrimaryRole,
  type AppRole,
} from "@/lib/roles/constants";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import type {
  HostRoleRequestAdminItem,
  HostRoleRequestPublic,
} from "@/lib/host-role-requests/types";
import { toAppIsoString } from "@/lib/datetime/format-app";

export type { HostRoleRequestAdminItem, HostRoleRequestPublic };

const log = logger.child({ module: "host-role-requests" });

function toPublic(row: HostRoleRequest): HostRoleRequestPublic {
  return {
    id: row.id,
    status: row.status as HostRoleRequestStatus,
    message: row.message ?? "",
    rejectionReason: row.rejectionReason,
    reviewedAt: toAppIsoString(row.reviewedAt),
    createdAt: toAppIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toAppIsoString(row.updatedAt) ?? new Date(0).toISOString(),
  };
}

export async function getLatestHostRoleRequestForUser(
  userId: string,
): Promise<HostRoleRequestPublic | null> {
  const [row] = await getDb()
    .select()
    .from(hostRoleRequests)
    .where(eq(hostRoleRequests.userId, userId))
    .orderBy(desc(hostRoleRequests.createdAt))
    .limit(1);

  return row ? toPublic(row) : null;
}

/**
 * Authoritative Settings → Roles payload: roles + latest request after reconcile.
 */
export async function getAccountHostRoleRequestState(userId: string): Promise<{
  hasHostRole: boolean;
  roles: AppRole[];
  request: HostRoleRequestPublic | null;
}> {
  const { reconcileHostRoleRequestsForUser } = await import(
    "@/lib/host-role-requests/sync-with-roles"
  );
  await reconcileHostRoleRequestsForUser(userId);

  const roles = await getUserRoleAssignments(userId);
  const hasHostRole = roles.includes("host") || roles.includes("super_admin");
  const request = await getLatestHostRoleRequestForUser(userId);

  return { hasHostRole, roles, request };
}

export async function getPendingHostRoleRequestForUser(
  userId: string,
): Promise<HostRoleRequestPublic | null> {
  const [row] = await getDb()
    .select()
    .from(hostRoleRequests)
    .where(
      and(eq(hostRoleRequests.userId, userId), eq(hostRoleRequests.status, "pending")),
    )
    .limit(1);

  return row ? toPublic(row) : null;
}

export async function createHostRoleRequest(
  userId: string,
  message: string,
): Promise<HostRoleRequestPublic> {
  const roles = await getUserRoleAssignments(userId);
  if (roles.includes("host") || roles.includes("super_admin")) {
    throw new AppError("You already have Host access.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [account] = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!account?.isActive) {
    throw new AppError("Your account is inactive.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  const pending = await getPendingHostRoleRequestForUser(userId);
  if (pending) {
    throw new AppError("You already have a pending Host role request.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const trimmedMessage = message.trim().slice(0, 1000);

  let created: HostRoleRequest;
  try {
    const [row] = await getDb()
      .insert(hostRoleRequests)
      .values({
        userId,
        status: "pending",
        message: trimmedMessage,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    if (!row) {
      throw new AppError("Could not create Host role request.", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
    created = row;
  } catch (error) {
    // Unique pending index race
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new AppError("You already have a pending Host role request.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    throw error;
  }

  log.info("Host role request created", { requestId: created.id, userId });

  void notifyAdminsHostRoleRequestSubmitted({
    requestId: created.id,
    requesterUserId: userId,
    requesterName: account.name?.trim() || "User",
    requesterEmail: account.email,
    message: trimmedMessage,
  });

  return toPublic(created);
}

export async function cancelHostRoleRequest(userId: string): Promise<HostRoleRequestPublic> {
  const [pending] = await getDb()
    .select()
    .from(hostRoleRequests)
    .where(
      and(eq(hostRoleRequests.userId, userId), eq(hostRoleRequests.status, "pending")),
    )
    .limit(1);

  if (!pending) {
    throw new AppError("No pending Host role request to cancel.", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const [updated] = await getDb()
    .update(hostRoleRequests)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(eq(hostRoleRequests.id, pending.id), eq(hostRoleRequests.status, "pending")),
    )
    .returning();

  if (!updated) {
    throw new AppError("Could not cancel Host role request.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  return toPublic(updated);
}

export async function listHostRoleRequestsForAdmin(options: {
  status: HostRoleRequestStatus;
  page: number;
  pageSize: number;
  search: string;
}): Promise<{
  items: HostRoleRequestAdminItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(Math.max(options.pageSize, 1), 50);
  const offset = (page - 1) * pageSize;

  const conditions = [eq(hostRoleRequests.status, options.status)];
  const search = options.search.trim();
  if (search) {
    conditions.push(
      or(
        ilike(user.name, `%${search}%`),
        ilike(user.email, `%${search}%`),
        ilike(hostRoleRequests.message, `%${search}%`),
      )!,
    );
  }
  const whereClause = and(...conditions);

  const [rows, [totalRow]] = await Promise.all([
    getDb()
      .select({
        request: hostRoleRequests,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(hostRoleRequests)
      .innerJoin(user, eq(user.id, hostRoleRequests.userId))
      .where(whereClause)
      .orderBy(desc(hostRoleRequests.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ value: count() })
      .from(hostRoleRequests)
      .innerJoin(user, eq(user.id, hostRoleRequests.userId))
      .where(whereClause),
  ]);

  const total = Number(totalRow?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    total,
    page,
    pageSize,
    totalPages,
    items: rows.map(({ request, userName, userEmail, userImage }) => ({
      ...toPublic(request),
      userId: request.userId,
      userName: userName?.trim() || "User",
      userEmail: userEmail,
      userImage: userImage,
      reviewedByUserId: request.reviewedByUserId,
    })),
  };
}

export async function getHostRoleRequestStatusCounts(): Promise<
  Record<HostRoleRequestStatus, number>
> {
  const rows = await getDb()
    .select({
      status: hostRoleRequests.status,
      value: count(),
    })
    .from(hostRoleRequests)
    .groupBy(hostRoleRequests.status);

  const counts: Record<HostRoleRequestStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    revoked: 0,
  };

  for (const row of rows) {
    const status = row.status as HostRoleRequestStatus;
    if (status in counts) {
      counts[status] = Number(row.value ?? 0);
    }
  }

  return counts;
}

export async function countPendingHostRoleRequests(): Promise<number> {
  const counts = await getHostRoleRequestStatusCounts();
  return counts.pending;
}

type DbTx = {
  select: ReturnType<typeof getDb>["select"];
  delete: ReturnType<typeof getDb>["delete"];
  insert: ReturnType<typeof getDb>["insert"];
  update: ReturnType<typeof getDb>["update"];
};

async function grantHostRoleInTransaction(
  tx: DbTx,
  userId: string,
  assignedBy: string,
): Promise<AppRole[]> {
  const assignmentRows = await tx
    .select({ role: userRoleAssignments.role })
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.userId, userId));

  const current: AppRole[] = [];
  for (const row of assignmentRows) {
    const normalized = normalizeLegacyRole(row.role);
    if (normalized) current.push(normalized);
  }

  let base = [...new Set(current)];
  if (base.length === 0) {
    const [legacy] = await tx
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    base = [normalizeLegacyRole(legacy?.role) ?? "player"];
  }

  const nextRoles: AppRole[] = [...new Set([...base, "host" as const])];
  if (nextRoles.length === 0) {
    nextRoles.push(...DEFAULT_REGISTRATION_ROLES);
  }

  await tx.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
  await tx.insert(userRoleAssignments).values(
    nextRoles.map((role) => ({
      id: randomUUID(),
      userId,
      role,
      assignedBy,
    })),
  );

  const primary = pickPrimaryRole(nextRoles);
  await tx
    .update(user)
    .set({ role: primary, updatedAt: new Date() })
    .where(eq(user.id, userId));

  return nextRoles;
}

export async function approveHostRoleRequest(
  requestId: string,
  adminUserId: string,
): Promise<HostRoleRequestPublic> {
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(hostRoleRequests)
      .where(eq(hostRoleRequests.id, requestId))
      .for("update")
      .limit(1);

    if (!locked) {
      throw new AppError("Host role request not found.", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
    if (locked.status !== "pending") {
      throw new AppError("This request has already been reviewed.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    const [account] = await tx
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      })
      .from(user)
      .where(eq(user.id, locked.userId))
      .limit(1);

    if (!account) {
      throw new AppError("Requester account no longer exists.", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
    if (!account.isActive) {
      throw new AppError("Cannot approve a request for an inactive account.", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    await grantHostRoleInTransaction(tx, locked.userId, adminUserId);

    const [updated] = await tx
      .update(hostRoleRequests)
      .set({
        status: "approved",
        rejectionReason: null,
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(hostRoleRequests.id, requestId), eq(hostRoleRequests.status, "pending")),
      )
      .returning();

    if (!updated) {
      throw new AppError("Could not approve Host role request.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    return { updated, account };
  });

  // Drop cached session so Host workspace appears on next load.
  if (process.env.DB_SCRIPT_MODE !== "true") {
    void import("@/lib/session/proxy-session")
      .then((m) => m.invalidateProxySessionCache(result.account.id))
      .catch(() => {
        /* best-effort */
      });
  }

  log.info("Host role request approved", {
    requestId,
    userId: result.account.id,
    adminUserId,
  });

  void notifyUserHostRoleRequestApproved({
    userId: result.account.id,
    email: result.account.email,
    userName: result.account.name,
  });

  return toPublic(result.updated);
}

export async function rejectHostRoleRequest(
  requestId: string,
  adminUserId: string,
  rejectionReason: string,
): Promise<HostRoleRequestPublic> {
  const reason = rejectionReason.trim();
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(hostRoleRequests)
      .where(eq(hostRoleRequests.id, requestId))
      .for("update")
      .limit(1);

    if (!locked) {
      throw new AppError("Host role request not found.", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
    if (locked.status !== "pending") {
      throw new AppError("This request has already been reviewed.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    const [account] = await tx
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, locked.userId))
      .limit(1);

    if (!account) {
      throw new AppError("Requester account no longer exists.", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const [updated] = await tx
      .update(hostRoleRequests)
      .set({
        status: "rejected",
        rejectionReason: reason,
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(hostRoleRequests.id, requestId), eq(hostRoleRequests.status, "pending")),
      )
      .returning();

    if (!updated) {
      throw new AppError("Could not reject Host role request.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    return { updated, account };
  });

  log.info("Host role request rejected", {
    requestId,
    userId: result.account.id,
    adminUserId,
  });

  void notifyUserHostRoleRequestRejected({
    userId: result.account.id,
    email: result.account.email,
    userName: result.account.name,
    rejectionReason: reason,
  });

  return toPublic(result.updated);
}
