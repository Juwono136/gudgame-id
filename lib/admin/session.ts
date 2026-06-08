import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { sports } from "@/db/schema";
import { getServerSession, requireSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import {
  ACTIVE_ROLE_COOKIE,
  ADMIN_SPORT_COOKIE,
  type AppRole,
} from "@/lib/roles/constants";
import {
  canAccessAdminConsole,
  canManageUsers,
  hasPermission,
  getPermissionsForRoles,
  type Permission,
} from "@/lib/roles/permissions";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { adminRoutes, authRoutes } from "@/lib/constants/routes";
import { getDefaultDashboardUrl } from "@/lib/roles/route-access";
import type { AdminSessionContext } from "@/lib/admin/types";

export type { AdminSessionContext };

async function resolveSportContext(): Promise<{ sportSlug: string; sportId: number }> {
  const db = getDb();
  const cookieStore = await cookies();
  const slugFromCookie = cookieStore.get(ADMIN_SPORT_COOKIE)?.value;

  const allSports = await db
    .select()
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(asc(sports.displayOrder));

  if (allSports.length === 0) {
    return { sportSlug: "padel", sportId: 0 };
  }

  const matched = slugFromCookie
    ? allSports.find((s) => s.slug === slugFromCookie)
    : undefined;
  const selected = matched ?? allSports[0]!;
  return { sportSlug: selected.slug, sportId: selected.id };
}

function resolveActiveRole(
  roles: AppRole[],
  cookieValue: string | undefined,
): AppRole {
  if (cookieValue && roles.includes(cookieValue as AppRole)) {
    return cookieValue as AppRole;
  }
  const adminRole = roles.find((r) => r === "super_admin" || r === "host");
  return adminRole ?? roles[0] ?? "player";
}

export async function getAdminSessionContext(): Promise<AdminSessionContext | null> {
  const session = await getServerSession();
  if (!session?.user) return null;

  const [dbUser] = await getDb()
    .select({
      isActive: user.isActive,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (dbUser && !dbUser.isActive) return null;

  const roles = await getUserRoleAssignments(session.user.id);
  if (!canAccessAdminConsole(roles)) return null;

  const [dbProfile] = await getDb()
    .select({ nickname: user.nickname })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const cookieStore = await cookies();
  const activeRole = resolveActiveRole(
    roles,
    cookieStore.get(ACTIVE_ROLE_COOKIE)?.value,
  );
  const sport = await resolveSportContext();
  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    nickname: dbProfile?.nickname?.trim() || null,
    image: session.user.image ?? null,
    roles,
    activeRole,
    permissions: getPermissionsForRoles(roles),
    ...sport,
  };
}

export async function requireAdminSession(): Promise<AdminSessionContext> {
  await requireSession();
  const ctx = await getAdminSessionContext();
  if (!ctx) {
    const session = await getServerSession();
    if (session?.user) {
      const roles = await getUserRoleAssignments(session.user.id);
      redirect(getDefaultDashboardUrl(roles));
    }
    redirect(`${authRoutes.login}?error=access_denied`);
  }
  return ctx;
}

export async function requireUserManagementAccess(): Promise<AdminSessionContext> {
  const ctx = await requireAdminSession();
  if (!canManageUsers(ctx.roles)) {
    throw new AppError("You do not have permission to manage users", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  return ctx;
}

export async function requireWikiManagementAccess(): Promise<AdminSessionContext> {
  const ctx = await requireAdminSession();
  if (!hasPermission(ctx.roles, "admin.wiki.manage")) {
    throw new AppError("You do not have permission to manage wiki entities", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  if (!ctx.sportId) {
    throw new AppError("No sport configured. Add an active sport first.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
  return ctx;
}

export function assertNotSelfTarget(
  actorId: string,
  targetId: string,
  action: string,
): void {
  if (actorId === targetId) {
    throw new AppError(`You cannot ${action} your own account`, {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
