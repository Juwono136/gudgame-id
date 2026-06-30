/** Consistent tournament + sport labeling for in-app notifications. */
export function tournamentNotificationTitle(
  sportName: string,
  tournamentName: string,
  headline: string,
): string {
  const sport = sportName.trim();
  const event = tournamentName.trim();
  if (!sport) return `${headline} — ${event}`;
  return `${headline} — ${sport} · ${event}`;
}

export function tournamentNotificationMetadata(
  tournament: {
    id: string;
    sportSlug?: string;
    sportName?: string;
  },
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    tournamentId: tournament.id,
    ...(tournament.sportSlug ? { sportSlug: tournament.sportSlug } : {}),
    ...(tournament.sportName ? { sportName: tournament.sportName } : {}),
    ...extra,
  };
}

export function readNotificationSportName(metadata: Record<string, unknown>): string | null {
  const value = metadata.sportName;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
