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
  matches: "/dashboard/matches",
  match: (id: number | string) => `/dashboard/matches/${id}`,
  tournaments: "/dashboard/tournaments",
  tournamentsNew: "/dashboard/tournaments/new",
  tournament: (id: string) => `/dashboard/tournaments/${id}`,
  tournamentEdit: (id: string) => `/dashboard/tournaments/${id}/edit`,
  payments: "/dashboard/payments",
  paymentReceipt: (paymentId: string) => `/dashboard/payments/receipt/${paymentId}`,
  completeProfile: "/dashboard/complete-profile",
  host: "/dashboard/host",
  hostTournaments: "/dashboard/host/tournaments",
  hostTournamentsNew: "/dashboard/host/tournaments/new",
  hostTournamentsNewReclub: "/dashboard/host/tournaments/new/reclub",
  /** @deprecated Redirect shim only — prefer publicSportRoutes.tournamentManage when slug is known */
  hostTournament: (id: string) => `/dashboard/host/tournaments/${id}`,
  hostTournamentEdit: (id: string) => `/dashboard/host/tournaments/${id}/edit`,
  hostPayments: "/dashboard/host/payments",
  hostSettings: "/dashboard/host/settings",
  /** @deprecated Renamed to host — use dashboardRoutes.host */
  contributor: "/dashboard/host",
} as const;

export const adminRoutes = {
  home: "/admin",
  /** @deprecated Host workspace lives under /dashboard/host */
  contributor: "/dashboard/host",
  host: "/dashboard/host",
  users: "/admin/users",
  contentApproval: "/admin/content-approval",
  wikiEntities: "/admin/wiki-entities",
  wikiEntitiesNew: "/admin/wiki-entities/new",
  tournamentEdit: (id: string) => `/admin/wiki-entities/tournaments/${id}/edit`,
  sports: "/admin/sports",
  settings: "/admin/settings",
} as const;

/** Legacy paths that redirect to the host dashboard */
export const LEGACY_HOST_DASHBOARD_PATHS = [
  "/dashboard/contributor",
  "/admin/contributor",
] as const;

export const publicSportRoutes = {
  sportHub: (sportSlug: string) => `/sports/${sportSlug}`,
  players: (sportSlug: string) => `/sports/${sportSlug}/players`,
  player: (sportSlug: string, slug: string) =>
    `/sports/${sportSlug}/players/${slug}`,
  teams: (sportSlug: string) => `/sports/${sportSlug}/teams`,
  team: (sportSlug: string, slug: string) => `/sports/${sportSlug}/teams/${slug}`,
  gear: (sportSlug: string) => `/sports/${sportSlug}/gear`,
  gearItem: (sportSlug: string, slug: string) => `/sports/${sportSlug}/gear/${slug}`,
  tournaments: (sportSlug: string) => `/sports/${sportSlug}/tournaments`,
  tournament: (sportSlug: string, slug: string) =>
    `/sports/${sportSlug}/tournaments/${slug}`,
  tournamentManage: (sportSlug: string, slug: string) =>
    `/sports/${sportSlug}/tournaments/${slug}/manage`,
  tournamentDisplay: (sportSlug: string, slug: string) =>
    `/sports/${sportSlug}/tournaments/${slug}/display`,
  tournamentDisplayMatch: (sportSlug: string, slug: string, matchId: string) =>
    `/sports/${sportSlug}/tournaments/${slug}/display?matchId=${encodeURIComponent(matchId)}`,
  tournamentInvite: (sportSlug: string, slug: string) =>
    `/sports/${sportSlug}/tournaments/${slug}/invite`,
  rules: (sportSlug: string) => `/sports/${sportSlug}/rules`,
} as const;

/** Legacy invite URLs from backend buildInviteUrl */
export const legacyTournamentRoutes = {
  invite: (sportSlug: string, slug: string) =>
    `/tournaments/${sportSlug}/${slug}/invite`,
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
 * Avoids marking Player Dashboard active on /dashboard/host (prefix clash).
 */
export function isDashboardNavLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;

  if (href === dashboardRoutes.home) {
    return pathname === dashboardRoutes.home;
  }

  if (href === dashboardRoutes.host) {
    return (
      pathname === dashboardRoutes.host ||
      pathname.startsWith(`${dashboardRoutes.host}/`) ||
      pathname === "/dashboard/contributor" ||
      pathname.startsWith("/dashboard/contributor/")
    );
  }

  if (href === adminRoutes.home) {
    return isAdminPage(pathname);
  }

  return pathname.startsWith(`${href}/`);
}
