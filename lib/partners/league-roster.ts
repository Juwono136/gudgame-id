import "server-only";

/** League settings key: map of teamId → partner_players ids on that roster. */
export const LEAGUE_TEAM_ROSTERS_KEY = "teamRosters";

export function readLeagueTeamRosters(
  settings: Record<string, unknown> | null | undefined,
): Record<string, string[]> {
  const raw = settings?.[LEAGUE_TEAM_ROSTERS_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [teamId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const ids = value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
    out[teamId] = [...new Set(ids)].slice(0, 16);
  }
  return out;
}

export function withLeagueTeamRoster(
  settings: Record<string, unknown>,
  teamId: string,
  playerIds: string[],
): Record<string, unknown> {
  const rosters = { ...readLeagueTeamRosters(settings) };
  const cleaned = [...new Set(playerIds.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    16,
  );
  if (cleaned.length === 0) {
    delete rosters[teamId];
  } else {
    rosters[teamId] = cleaned;
  }
  return {
    ...settings,
    [LEAGUE_TEAM_ROSTERS_KEY]: rosters,
  };
}
