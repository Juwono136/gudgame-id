import "server-only";
import { randomUUID } from "crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, account } from "@/db/schema/auth";
import { userRoleAssignments } from "@/db/schema/roles";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors";
import { normalizeNicknameInput } from "@/lib/auth/nickname-rules";
import type { AppRole } from "@/lib/roles/constants";
import { getDbRoleFilterValues, pickPrimaryRole } from "@/lib/roles/constants";
import { getLastLoginMap } from "@/lib/auth/last-login";
import { getUserRoleAssignments, setUserRoles } from "@/lib/roles/sync";
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  AdminUsersListQuery,
} from "@/lib/validations/admin-users";

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  image: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  fullNameKtp: string | null;
  /** Highest career tier from linked player profiles (defaults to Bronze). */
  playerTier: string;
  playerTierLevel: string;
  careerPoints: number;
};

export type AdminUsersListResult = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function sortColumn(sortBy: AdminUsersListQuery["sortBy"]) {
  switch (sortBy) {
    case "name":
      return user.name;
    case "nickname":
      return user.nickname;
    case "lastLogin":
      return user.lastLoginAt;
    default:
      return user.name;
  }
}

export async function listAdminUsers(
  query: AdminUsersListQuery,
): Promise<AdminUsersListResult> {
  const db = getDb();
  const { page, pageSize, search, role, status, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        ilike(user.name, term),
        ilike(user.email, term),
        ilike(user.nickname, term),
      ),
    );
  }

  if (status === "active") conditions.push(eq(user.isActive, true));
  if (status === "inactive") conditions.push(eq(user.isActive, false));

  let userIdsForRole: string[] | null = null;
  if (role) {
    const roleRows = await db
      .select({ userId: userRoleAssignments.userId })
      .from(userRoleAssignments)
      .where(inArray(userRoleAssignments.role, getDbRoleFilterValues(role)));
    userIdsForRole = roleRows.map((r) => r.userId);
    if (userIdsForRole.length === 0) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
    conditions.push(inArray(user.id, userIdsForRole));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ count: count() })
    .from(user)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      nickname: user.nickname,
      image: user.image,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      fullNameKtp: user.fullNameKtp,
    })
    .from(user)
    .where(whereClause)
    .orderBy(orderFn(sortColumn(sortBy)))
    .limit(pageSize)
    .offset(offset);

  const lastLoginMap = await getLastLoginMap(rows.map((r) => r.id));
  const { getAdminUserPlayerTierMap } = await import("@/lib/admin/users/player-tier");
  const tierMap = await getAdminUserPlayerTierMap(rows.map((r) => r.id));

  const items: AdminUserListItem[] = await Promise.all(
    rows.map(async (row) => {
      const roles = await getUserRoleAssignments(row.id);
      const lastLogin = row.lastLoginAt ?? lastLoginMap[row.id] ?? null;
      const tier = tierMap.get(row.id)!;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        nickname: row.nickname,
        image: row.image,
        roles,
        primaryRole: pickPrimaryRole(roles),
        isActive: row.isActive,
        emailVerified: row.emailVerified,
        createdAt: row.createdAt.toISOString(),
        lastLoginAt: lastLogin ? lastLogin.toISOString() : null,
        phone: row.phone,
        phoneCountryCode: row.phoneCountryCode,
        fullNameKtp: row.fullNameKtp,
        playerTier: tier.tierLabel,
        playerTierLevel: tier.tierLevel,
        careerPoints: tier.totalPoints,
      };
    }),
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminUserById(id: string): Promise<AdminUserListItem | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      nickname: user.nickname,
      image: user.image,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      fullNameKtp: user.fullNameKtp,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!row) return null;

  const roles = await getUserRoleAssignments(row.id);
  const lastLoginMap = await getLastLoginMap([row.id]);
  const lastLogin = row.lastLoginAt ?? lastLoginMap[row.id] ?? null;
  const { getAdminUserPlayerTierMap } = await import("@/lib/admin/users/player-tier");
  const tier = (await getAdminUserPlayerTierMap([row.id])).get(row.id)!;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    nickname: row.nickname,
    image: row.image,
    roles,
    primaryRole: pickPrimaryRole(roles),
    isActive: row.isActive,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: lastLogin ? lastLogin.toISOString() : null,
    phone: row.phone,
    phoneCountryCode: row.phoneCountryCode,
    fullNameKtp: row.fullNameKtp,
    playerTier: tier.tierLabel,
    playerTierLevel: tier.tierLevel,
    careerPoints: tier.totalPoints,
  };
}

export type AdminCreateUserOptions = {
  imageUrl?: string | null;
  imageStorageKey?: string | null;
};

export async function createAdminUser(
  input: AdminCreateUserInput,
  assignedBy: string,
  options: AdminCreateUserOptions = {},
): Promise<AdminUserListItem> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const nicknameRaw = input.nickname?.trim() ?? "";
  const normalizedNick = nicknameRaw ? normalizeNicknameInput(nicknameRaw) : null;

  if (nicknameRaw && !normalizedNick) {
    throw new AppError("Invalid nickname format", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    throw new AppError("A user with this email already exists", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (normalizedNick) {
    const { isNicknameAvailable } = await import("@/lib/auth/nickname");
    const available = await isNicknameAvailable(normalizedNick);
    if (!available) {
      throw new AppError("Nickname is already taken", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
  }

  const { generateSecureTemporaryPassword } = await import(
    "@/lib/auth/generate-password"
  );
  const { setAdminInvitePending } = await import("@/lib/auth/admin-invite-pending");
  const { getDialByCountryCode } = await import("@/lib/constants/phone-countries");
  const { authRoutes } = await import("@/lib/constants/routes");
  const { getBaseUrl } = await import("@/lib/auth/urls-server");

  const temporaryPassword = generateSecureTemporaryPassword();
  await setAdminInvitePending(email, temporaryPassword);

  const baseUrl = getBaseUrl();
  const signUp = await auth.api.signUpEmail({
    body: {
      email,
      password: temporaryPassword,
      name: input.fullNameKtp,
      image: options.imageUrl ?? undefined,
      callbackURL: `${baseUrl}${authRoutes.verifyEmail}?status=success`,
    },
  });

  if (!signUp?.user?.id) {
    throw new AppError("Failed to create user account", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  const userId = signUp.user.id;
  const phoneDialCode =
    getDialByCountryCode(input.phoneCountryCode) ?? input.phoneCountryCode;

  await db
    .update(user)
    .set({
      emailVerified: false,
      isActive: input.isActive,
      nickname: normalizedNick,
      phone: input.phone,
      phoneCountryCode: phoneDialCode,
      fullNameKtp: input.fullNameKtp,
      image: options.imageUrl ?? null,
      imageStorageKey: options.imageStorageKey ?? null,
      mustChangePassword: true,
      invitedByAdmin: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  await setUserRoles(userId, input.roles, assignedBy);

  if (input.roles.includes("partner")) {
    const slug =
      (input as { partnerSlug?: string }).partnerSlug?.trim() ||
      `partner-${userId.slice(0, 8).toLowerCase()}`;
    const displayName =
      (input as { partnerDisplayName?: string }).partnerDisplayName?.trim() ||
      input.fullNameKtp;
    await (
      await import("@/lib/partners/service")
    ).createPartnerWithOwner({
      slug,
      displayName,
      ownerUserId: userId,
      createdBy: assignedBy,
    });
  }

  const created = await getAdminUserById(userId);
  if (!created) {
    throw new AppError("User created but could not be loaded", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }
  return created;
}

export async function updateAdminUser(
  id: string,
  input: AdminUpdateUserInput,
  assignedBy: string,
): Promise<AdminUserListItem> {
  const db = getDb();
  const existing = await getAdminUserById(id);
  if (!existing) {
    throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (input.email && input.email.toLowerCase() !== existing.email.toLowerCase()) {
    const [emailTaken] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.email.toLowerCase()))
      .limit(1);
    if (emailTaken && emailTaken.id !== id) {
      throw new AppError("Email is already in use", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
  }

  let normalizedNick: string | null | undefined = undefined;
  if (input.nickname !== undefined) {
    normalizedNick = input.nickname
      ? normalizeNicknameInput(input.nickname)
      : null;
    if (input.nickname && !normalizedNick) {
      throw new AppError("Invalid nickname format", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
    if (normalizedNick) {
      const [nickTaken] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.nickname, normalizedNick))
        .limit(1);
      if (nickTaken && nickTaken.id !== id) {
        throw new AppError("Nickname is already taken", {
          code: "CONFLICT",
          statusCode: 409,
        });
      }
    }
  }

  const patch: Partial<typeof user.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name) patch.name = input.name;
  if (input.email) patch.email = input.email.toLowerCase();
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (input.emailVerified !== undefined) patch.emailVerified = input.emailVerified;
  if (normalizedNick !== undefined) patch.nickname = normalizedNick;

  if (Object.keys(patch).length > 1) {
    await db.update(user).set(patch).where(eq(user.id, id));
    if (input.isActive === false) {
      const { revokeAllUserSessions } = await import("@/lib/auth/account-status");
      await revokeAllUserSessions(id);
    }
    const { invalidateProxySessionCache } = await import(
      "@/lib/session/proxy-session"
    );
    void invalidateProxySessionCache(id);
  }

  if (input.password) {
    const hashed = await hashPassword(input.password);
    const [credAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(eq(account.userId, id), eq(account.providerId, "credential")),
      )
      .limit(1);

    if (credAccount) {
      await db
        .update(account)
        .set({ password: hashed, updatedAt: new Date() })
        .where(eq(account.id, credAccount.id));
    }
  }

  if (input.roles) {
    await setUserRoles(id, input.roles, assignedBy);
  }

  const updated = await getAdminUserById(id);
  if (!updated) {
    throw new AppError("User not found after update", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }
  return updated;
}

export async function deleteAdminUser(id: string): Promise<void> {
  const db = getDb();

  const [row] = await db
    .select({
      id: user.id,
      image: user.image,
      imageStorageKey: user.imageStorageKey,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!row) {
    throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const { archivePublishedPlayerProfilesForUser } = await import(
    "@/lib/wiki/active-player-eligibility"
  );
  await archivePublishedPlayerProfilesForUser(id);

  const result = await db.delete(user).where(eq(user.id, id)).returning({ id: user.id });
  if (result.length === 0) {
    throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const { deleteUserProfileMediaFromStorage } = await import(
    "@/lib/storage/object-lifecycle"
  );
  await deleteUserProfileMediaFromStorage(row);
}

export async function getAdminUserStats(): Promise<{
  totalStaff: number;
  activeAccounts: number;
  activeNow: number;
  byRole: Record<string, number>;
}> {
  const db = getDb();

  const [totalRow] = await db.select({ count: count() }).from(user);

  const [activeAccountsRow] = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.isActive, true));

  const roleCounts = await db
    .select({
      role: userRoleAssignments.role,
      count: sql<number>`count(*)::int`,
    })
    .from(userRoleAssignments)
    .groupBy(userRoleAssignments.role);

  const byRole: Record<string, number> = {};
  for (const row of roleCounts) {
    byRole[row.role] = Number(row.count);
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [activeRow] = await db
    .select({ count: count() })
    .from(user)
    .where(and(eq(user.isActive, true), gte(user.updatedAt, oneDayAgo)));

  return {
    totalStaff: Number(totalRow?.count ?? 0),
    activeAccounts: Number(activeAccountsRow?.count ?? 0),
    activeNow: Number(activeRow?.count ?? 0),
    byRole,
  };
}

export async function updateAdminUserStaff(
  id: string,
  input: {
    roles: AppRole[];
    isActive: boolean;
    partnerSlug?: string;
    partnerDisplayName?: string;
  },
  assignedBy: string,
  options?: { allowSelfDeactivate?: boolean },
): Promise<AdminUserListItem> {
  if (
    id === assignedBy &&
    !input.isActive &&
    !options?.allowSelfDeactivate
  ) {
    throw new AppError("You cannot deactivate your own account", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  await setUserRoles(id, input.roles, assignedBy);

  if (input.roles.includes("partner")) {
    const existing = await (
      await import("@/lib/partners/service")
    ).getPrimaryPartnerForUser(id);
    if (!existing) {
      const slug =
        input.partnerSlug?.trim() ||
        `partner-${id.slice(0, 8).toLowerCase()}`;
      const displayName =
        input.partnerDisplayName?.trim() ||
        (await getAdminUserById(id))?.name ||
        "Partner";
      await (
        await import("@/lib/partners/service")
      ).createPartnerWithOwner({
        slug,
        displayName,
        ownerUserId: id,
        createdBy: assignedBy,
      });
    }
  }

  const db = getDb();
  await db
    .update(user)
    .set({ isActive: input.isActive, updatedAt: new Date() })
    .where(eq(user.id, id));

  if (!input.isActive) {
    const { revokeAllUserSessions } = await import("@/lib/auth/account-status");
    await revokeAllUserSessions(id);
  }

  const { invalidateProxySessionCache } = await import(
    "@/lib/session/proxy-session"
  );
  void invalidateProxySessionCache(id);

  const updated = await getAdminUserById(id);
  if (!updated) {
    throw new AppError("User not found after update", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }
  return updated;
}
