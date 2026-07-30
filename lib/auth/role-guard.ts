import "server-only";

import { redirect } from "next/navigation";
import { getUserAccountStatusById } from "@/lib/auth/account-status";
import {
  getServerSession,
  requireSession,
  signOutCurrentSession,
} from "@/lib/auth/session";
import { authRoutes } from "@/lib/constants/routes";
import { AppError } from "@/lib/errors";
import type { AppRole } from "@/lib/roles/constants";
import {
  canAccessAccountSettings,
  canAccessHostDashboard,
  canAccessPartnerDashboard,
  canAccessPlayerDashboard,
  getAccessDeniedRedirect,
  getDefaultDashboardUrl,
  isPathAllowedForRoles,
} from "@/lib/roles/route-access";
import { getUserRoleAssignments } from "@/lib/roles/sync";

export type RoleGuardContext = {
  userId: string;
  roles: AppRole[];
};

async function redirectInactiveAccount(): Promise<never> {
  await signOutCurrentSession();
  redirect(`${authRoutes.login}?error=account_inactive`);
}

async function loadRoleGuardContext(): Promise<RoleGuardContext> {
  const session = await requireSession();
  const account = await getUserAccountStatusById(session.user.id);

  if (account && !account.isActive) {
    return redirectInactiveAccount();
  }

  const roles = await getUserRoleAssignments(session.user.id);
  return { userId: session.user.id, roles };
}

function deny(roles: AppRole[]): never {
  redirect(getDefaultDashboardUrl(roles));
}

export async function requireRoleGuardContext(): Promise<RoleGuardContext> {
  return loadRoleGuardContext();
}

/** API routes must return JSON — never redirect to login HTML. */
export async function requireApiRoleGuardContext(): Promise<RoleGuardContext> {
  const session = await getServerSession();
  if (!session?.user) {
    throw new AppError("Authentication required", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }

  const account = await getUserAccountStatusById(session.user.id);
  if (account && !account.isActive) {
    throw new AppError("Account is inactive", { code: "FORBIDDEN", statusCode: 403 });
  }

  const roles = await getUserRoleAssignments(session.user.id);
  return { userId: session.user.id, roles };
}

export async function requirePlayerDashboardAccess(): Promise<RoleGuardContext> {
  const ctx = await loadRoleGuardContext();
  if (!canAccessPlayerDashboard(ctx.roles)) deny(ctx.roles);
  return ctx;
}

export async function requireHostDashboardAccess(): Promise<RoleGuardContext> {
  const ctx = await loadRoleGuardContext();
  if (!canAccessHostDashboard(ctx.roles)) deny(ctx.roles);
  return ctx;
}

export async function requirePartnerDashboardAccess(): Promise<RoleGuardContext> {
  const ctx = await loadRoleGuardContext();
  if (!canAccessPartnerDashboard(ctx.roles)) deny(ctx.roles);
  return ctx;
}

/** API routes — JSON errors instead of login redirects. */
export async function requireApiHostDashboardAccess(): Promise<RoleGuardContext> {
  const ctx = await requireApiRoleGuardContext();
  if (!canAccessHostDashboard(ctx.roles)) {
    throw new AppError("Host access required", { code: "FORBIDDEN", statusCode: 403 });
  }
  return ctx;
}

export async function requireApiPartnerDashboardAccess(): Promise<RoleGuardContext> {
  const ctx = await requireApiRoleGuardContext();
  if (!canAccessPartnerDashboard(ctx.roles)) {
    throw new AppError("Partner access required", { code: "FORBIDDEN", statusCode: 403 });
  }
  return ctx;
}

export async function requireAccountSettingsAccess(): Promise<RoleGuardContext> {
  const ctx = await loadRoleGuardContext();
  if (!canAccessAccountSettings(ctx.roles)) {
    redirect(`${authRoutes.login}?error=no_role`);
  }
  return ctx;
}

export async function enforcePathRoleAccess(pathname: string): Promise<RoleGuardContext> {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(`${authRoutes.login}?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  const account = await getUserAccountStatusById(session.user.id);

  if (account && !account.isActive) {
    return redirectInactiveAccount();
  }

  const roles = await getUserRoleAssignments(session.user.id);

  if (!isPathAllowedForRoles(pathname, roles)) {
    redirect(getAccessDeniedRedirect(pathname, roles));
  }

  return { userId: session.user.id, roles };
}
