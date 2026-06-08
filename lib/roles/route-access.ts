import {
  adminRoutes,
  authRoutes,
  dashboardRoutes,
  isAdminPage,
} from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";

export type DashboardZone = "player" | "contributor" | "admin" | "account_settings";

export function canAccessPlayerDashboard(roles: AppRole[]): boolean {
  return roles.includes("player");
}

export function canAccessContributorDashboard(roles: AppRole[]): boolean {
  return roles.includes("contributor");
}

export function canAccessAdminConsole(roles: AppRole[]): boolean {
  return roles.includes("super_admin");
}

/** Profile/settings for any signed-in user with at least one assigned role */
export function canAccessAccountSettings(roles: AppRole[]): boolean {
  return roles.length > 0;
}

export function getDashboardZoneForPath(pathname: string): DashboardZone | null {
  if (pathname === dashboardRoutes.home) return "player";
  if (
    pathname === dashboardRoutes.contributor ||
    pathname.startsWith(`${dashboardRoutes.contributor}/`)
  ) {
    return "contributor";
  }
  if (
    pathname === dashboardRoutes.settings ||
    pathname.startsWith(`${dashboardRoutes.settings}/`)
  ) {
    return "account_settings";
  }
  if (isAdminPage(pathname)) return "admin";
  return null;
}

export function isRoleProtectedPath(pathname: string): boolean {
  return getDashboardZoneForPath(pathname) !== null;
}

export function isPathAllowedForRoles(pathname: string, roles: AppRole[]): boolean {
  const zone = getDashboardZoneForPath(pathname);
  if (!zone) return true;

  switch (zone) {
    case "player":
      return canAccessPlayerDashboard(roles);
    case "contributor":
      return canAccessContributorDashboard(roles);
    case "admin":
      return canAccessAdminConsole(roles);
    case "account_settings":
      return canAccessAccountSettings(roles);
    default:
      return false;
  }
}

/** Primary landing page after sign-in (highest-privilege dashboard first) */
export function getDefaultDashboardUrl(roles: AppRole[]): string {
  if (canAccessAdminConsole(roles)) return adminRoutes.home;
  if (canAccessContributorDashboard(roles)) return dashboardRoutes.contributor;
  if (canAccessPlayerDashboard(roles)) return dashboardRoutes.home;
  return `${authRoutes.login}?error=no_role`;
}

/** Where to send a user who hit a dashboard they are not allowed to use */
export function getAccessDeniedRedirect(pathname: string, roles: AppRole[]): string {
  if (isPathAllowedForRoles(pathname, roles)) {
    return pathname;
  }
  return getDefaultDashboardUrl(roles);
}

/**
 * Validates post-login callback paths so users cannot open dashboards
 * they no longer have after a role change.
 */
export function resolveSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  roles: AppRole[],
  options?: { mustChangePassword?: boolean },
): string {
  if (options?.mustChangePassword) {
    return authRoutes.changePasswordRequired;
  }

  if (!callbackUrl?.trim()) return getDefaultDashboardUrl(roles);

  let path = callbackUrl.trim();
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname;
    } catch {
      return getDefaultDashboardUrl(roles);
    }
  }

  if (!path.startsWith("/")) path = `/${path}`;

  if (isPathAllowedForRoles(path, roles)) return path;
  return getDefaultDashboardUrl(roles);
}
