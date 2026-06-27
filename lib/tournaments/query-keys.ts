export const tournamentQueryKeys = {
  live: (sportSlug: string, slug: string) =>
    ["tournaments", "live", sportSlug, slug] as const,
  lobby: (sportSlug: string, slug: string) =>
    ["tournaments", "lobby", sportSlug, slug] as const,
  bracket: (sportSlug: string, slug: string) =>
    ["tournaments", "bracket", sportSlug, slug] as const,
  accessInvites: (sportSlug: string, slug: string) =>
    ["tournaments", "access-invites", sportSlug, slug] as const,
  playerInvites: (sportSlug: string, slug: string) =>
    ["tournaments", "player-invites", sportSlug, slug] as const,
  allForTournament: (sportSlug: string, slug: string) =>
    [
      ["tournaments", "live", sportSlug, slug],
      ["tournaments", "lobby", sportSlug, slug],
      ["tournaments", "bracket", sportSlug, slug],
    ] as const,
};

export function invalidateTournamentQueries(
  qc: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => void },
  sportSlug: string,
  slug: string,
) {
  for (const key of tournamentQueryKeys.allForTournament(sportSlug, slug)) {
    qc.invalidateQueries({ queryKey: key });
  }
}
