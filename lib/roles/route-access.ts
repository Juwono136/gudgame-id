import {
  adminRoutes,
  authRoutes,
  dashboardRoutes,
  isAdminPage,
} from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";

export type DashboardZone = "player" | "host" | "admin" | "account_settings";

export function canAccessPlayerDashboard(roles: AppRole[]): boolean {
  return roles.includes("player");
}

export function canAccessHostDashboard(roles: AppRole[]): boolean {
  return roles.includes("host");
}

export function canAccessAdminConsole(roles: AppRole[]): boolean {
  return roles.includes("super_admin");
}

/** Profile/settings for any signed-in user with at least one assigned role */
export function canAccessAccountSettings(roles: AppRole[]): boolean {
  return roles.length > 0;
}

function normalizeLegacyDashboardPath(pathname: string): string {
  if (
    pathname === "/dashboard/contributor" ||
    pathname.startsWith("/dashboard/contributor/")
  ) {
    return pathname.replace("/dashboard/contributor", dashboardRoutes.host);
  }
  return pathname;
}

export function getDashboardZoneForPath(pathname: string): DashboardZone | null {
  pathname = normalizeLegacyDashboardPath(pathname);

  if (pathname === dashboardRoutes.home) return "player";
  if (
    pathname === dashboardRoutes.host ||
    pathname.startsWith(`${dashboardRoutes.host}/`)
  ) {
    return "host";
  }
  if (
    pathname === dashboardRoutes.settings ||
    pathname.startsWith(`${dashboardRoutes.settings}/`) ||
    pathname === dashboardRoutes.completeProfile ||
    pathname.startsWith(`${dashboardRoutes.completeProfile}/`)
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
    case "host":
      return canAccessHostDashboard(roles);
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
  if (canAccessHostDashboard(roles)) return dashboardRoutes.host;
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

  path = normalizeLegacyDashboardPath(path);

  if (isPathAllowedForRoles(path, roles)) return path;
  return getDefaultDashboardUrl(roles);
}
