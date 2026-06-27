/**
 * Host management UI is toggled with `?manage=1` on the public tournament URL.
 *
 * The value `1` is a boolean flag (mode on), not a tournament ID — the tournament
 * is already identified by `/sports/{sportSlug}/tournaments/{slug}` in the path.
 */
export const TOURNAMENT_MANAGE_PARAM = "manage";
export const TOURNAMENT_MANAGE_ACTIVE_VALUE = "1";

export function isTournamentManageMode(searchParams: Pick<URLSearchParams, "get">): boolean {
  return searchParams.get(TOURNAMENT_MANAGE_PARAM) === TOURNAMENT_MANAGE_ACTIVE_VALUE;
}

export function withTournamentManageMode(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${TOURNAMENT_MANAGE_PARAM}=${TOURNAMENT_MANAGE_ACTIVE_VALUE}`;
}

export function tournamentManageTabUrl(
  sportSlug: string,
  slug: string,
  tab: string,
): string {
  return tournamentTabUrl(sportSlug, slug, tab, true);
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
