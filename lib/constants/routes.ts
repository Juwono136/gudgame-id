export const authRoutes = {
  login: "/login",
  register: "/register",
  checkEmail: "/auth/check-email",
  verifyEmail: "/auth/verify-email",
  changePasswordRequired: "/auth/change-password",
  forgotPassword: "/forgot-password",
  forgotPasswordSent: "/auth/forgot-password/sent",
  resetPassword: "/auth/reset-password",
} as const;

export const CHANGE_PASSWORD_REQUIRED_PATH = authRoutes.changePasswordRequired;

export const dashboardRoutes = {
  home: "/dashboard",
  settings: "/dashboard/settings",
  contributor: "/dashboard/contributor",
} as const;

export const adminRoutes = {
  home: "/admin",
  /** @deprecated Contributor workspace lives under /dashboard/contributor */
  contributor: "/dashboard/contributor",
  users: "/admin/users",
  contentApproval: "/admin/content-approval",
  wikiEntities: "/admin/wiki-entities",
  wikiEntitiesNew: "/admin/wiki-entities/new",
  sports: "/admin/sports",
  settings: "/admin/settings",
} as const;

export const publicSportRoutes = {
  sportHub: (sportSlug: string) => `/sports/${sportSlug}`,
  players: (sportSlug: string) => `/sports/${sportSlug}/players`,
  player: (sportSlug: string, slug: string) =>
    `/sports/${sportSlug}/players/${slug}`,
  teams: (sportSlug: string) => `/sports/${sportSlug}/teams`,
  team: (sportSlug: string, slug: string) => `/sports/${sportSlug}/teams/${slug}`,
  gear: (sportSlug: string) => `/sports/${sportSlug}/gear`,
  gearItem: (sportSlug: string, slug: string) => `/sports/${sportSlug}/gear/${slug}`,
} as const;

export const ADMIN_PATH_PREFIX = "/admin" as const;

/** Guest auth flows only — excludes forced password change (handled separately). */
export const AUTH_PAGE_PATHS = [
  authRoutes.login,
  authRoutes.register,
  authRoutes.checkEmail,
  authRoutes.verifyEmail,
  authRoutes.forgotPassword,
  authRoutes.forgotPasswordSent,
  authRoutes.resetPassword,
] as const;

export function isChangePasswordRequiredPath(pathname: string): boolean {
  return (
    pathname === authRoutes.changePasswordRequired ||
    pathname.startsWith(`${authRoutes.changePasswordRequired}/`)
  );
}

export const PROTECTED_PATH_PREFIXES = ["/dashboard", ADMIN_PATH_PREFIX] as const;

export function isAdminPage(pathname: string): boolean {
  return pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isDashboardActive(pathname: string): boolean {
  return pathname === dashboardRoutes.home;
}

export function isSettingsActive(pathname: string): boolean {
  return (
    pathname === dashboardRoutes.settings ||
    pathname.startsWith(`${dashboardRoutes.settings}/`)
  );
}

/**
 * Whether a profile-menu dashboard link matches the current route.
 * Avoids marking Player Dashboard active on /dashboard/contributor (prefix clash).
 */
export function isDashboardNavLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;

  if (href === dashboardRoutes.home) {
    return pathname === dashboardRoutes.home;
  }

  if (href === dashboardRoutes.contributor) {
    return (
      pathname === dashboardRoutes.contributor ||
      pathname.startsWith(`${dashboardRoutes.contributor}/`)
    );
  }

  if (href === adminRoutes.home) {
    return isAdminPage(pathname);
  }

  return pathname.startsWith(`${href}/`);
}
