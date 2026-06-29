/** @deprecated Legacy query flag — redirects to `/manage` route */
export const TOURNAMENT_MANAGE_PARAM = "manage";
export const TOURNAMENT_MANAGE_ACTIVE_VALUE = "1";

export function tournamentManagePath(sportSlug: string, slug: string, section?: string): string {
  const base = `/sports/${sportSlug}/tournaments/${slug}/manage`;
  if (!section) return base;
  return `${base}?section=${encodeURIComponent(section)}`;
}

/** @deprecated Use tournamentManagePath — kept for redirect detection */
export function isTournamentManageMode(searchParams: Pick<URLSearchParams, "get">): boolean {
  return searchParams.get(TOURNAMENT_MANAGE_PARAM) === TOURNAMENT_MANAGE_ACTIVE_VALUE;
}

export function withTournamentManageMode(sportSlug: string, slug: string): string {
  return tournamentManagePath(sportSlug, slug);
}

export function tournamentManageTabUrl(sportSlug: string, slug: string, section: string): string {
  return tournamentManagePath(sportSlug, slug, section);
}

export function tournamentTabUrl(
  sportSlug: string,
  slug: string,
  tab: string,
  manage = false,
): string {
  const base = `/sports/${sportSlug}/tournaments/${slug}`;
  const params = new URLSearchParams();
  if (manage) {
    params.set(TOURNAMENT_MANAGE_PARAM, TOURNAMENT_MANAGE_ACTIVE_VALUE);
  }
  params.set("tab", tab);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
