export type PartnerLeagueStatus = "draft" | "active" | "completed" | "archived";
export type PartnerLeagueMatchStatus = "scheduled" | "completed" | "cancelled";

export type PartnerLeagueListItem = {
  id: string;
  partnerId: string;
  sportId: string;
  sportSlug: string;
  sportName: string;
  slug: string;
  name: string;
  status: PartnerLeagueStatus;
  teamCount: number;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PartnerLeagueTeamView = {
  id: string;
  name: string;
  sortOrder: number;
};

export type PartnerLeagueMatchView = {
  id: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  scoreA: number | null;
  scoreB: number | null;
  status: PartnerLeagueMatchStatus;
  playedAt: string | null;
  notes: string | null;
};

export type PartnerLeagueStandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
};

export type PartnerLeagueDetail = PartnerLeagueListItem & {
  settings: Record<string, unknown>;
  teams: PartnerLeagueTeamView[];
  matches: PartnerLeagueMatchView[];
  standings: PartnerLeagueStandingRow[];
};

export function computeLeagueStandings(
  teams: PartnerLeagueTeamView[],
  matches: PartnerLeagueMatchView[],
): PartnerLeagueStandingRow[] {
  const map = new Map<string, PartnerLeagueStandingRow>();
  for (const team of teams) {
    map.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "completed") continue;
    if (match.scoreA == null || match.scoreB == null) continue;
    const a = map.get(match.teamAId);
    const b = map.get(match.teamBId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.pointsFor += match.scoreA;
    a.pointsAgainst += match.scoreB;
    b.pointsFor += match.scoreB;
    b.pointsAgainst += match.scoreA;

    if (match.scoreA > match.scoreB) {
      a.wins += 1;
      a.points += 3;
      b.losses += 1;
    } else if (match.scoreB > match.scoreA) {
      b.wins += 1;
      b.points += 3;
      a.losses += 1;
    } else {
      a.draws += 1;
      b.draws += 1;
      a.points += 1;
      b.points += 1;
    }
  }

  const rows = [...map.values()].map((row) => ({
    ...row,
    diff: row.pointsFor - row.pointsAgainst,
  }));

  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.diff !== x.diff) return y.diff - x.diff;
    if (y.pointsFor !== x.pointsFor) return y.pointsFor - x.pointsFor;
    return x.teamName.localeCompare(y.teamName);
  });

  return rows;
}
