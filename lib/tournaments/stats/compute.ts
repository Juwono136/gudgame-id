import type {
  StatsMatchInput,
  StatsTeamInput,
  TournamentPlayerStatRow,
  TournamentSessionStats,
  TournamentTeamStatRow,
} from "@/lib/tournaments/stats/types";
import { matchWinRatePercent } from "@/lib/tournaments/stats/win-rate";

function dedupeMatches(
  matches: StatsMatchInput[],
  keyFn: (match: StatsMatchInput) => string,
): StatsMatchInput[] {
  const seen = new Set<string>();
  const unique: StatsMatchInput[] = [];

  for (const match of matches) {
    const key = keyFn(match);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(match);
  }

  return unique;
}

function isTournamentTeam(
  teamId: string | null,
  teamName: string,
  teams: StatsTeamInput[],
): boolean {
  if (teamId) {
    return teams.some((t) => t.id === teamId);
  }
  return teams.some((t) => t.name === teamName);
}

function getOrCreateTeam(
  map: Map<string, TournamentTeamStatRow>,
  name: string,
  teamId: string | null,
  teams: StatsTeamInput[],
): TournamentTeamStatRow {
  const existing = map.get(name);
  if (existing) return existing;

  const team = teams.find((t) => t.id === teamId || t.name === name);
  const row: TournamentTeamStatRow = {
    teamId: team?.id ?? teamId,
    name,
    memberCount: team?.memberCount ?? 0,
    wins: 0,
    losses: 0,
    draws: 0,
    played: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    winRate: 0,
  };
  map.set(name, row);
  return row;
}

export function computeTournamentSessionStats(input: {
  matches: StatsMatchInput[];
  teams: StatsTeamInput[];
  totalPlayers: number;
  players?: TournamentPlayerStatRow[];
  dedupeKey?: (match: StatsMatchInput) => string;
}): TournamentSessionStats {
  const dedupeKey = input.dedupeKey ?? ((m) => m.id);

  const activeTeams =
    input.teams.filter((t) => t.memberCount > 0).length || input.teams.length;

  const allMatches = dedupeMatches(input.matches, dedupeKey).filter((m) =>
    isTournamentTeam(m.teamAId, m.teamAName, input.teams) &&
    isTournamentTeam(m.teamBId, m.teamBName, input.teams),
  );

  const completed = allMatches.filter((m) => m.status === "completed");
  const inProgress = allMatches.filter((m) => m.status === "in_progress");

  const durations: number[] = [];
  const teamMap = new Map<string, TournamentTeamStatRow>();

  for (const team of input.teams) {
    getOrCreateTeam(teamMap, team.name, team.id, input.teams);
  }

  for (const m of completed) {
    if (m.durationSeconds != null) durations.push(m.durationSeconds);

    const teamA = getOrCreateTeam(teamMap, m.teamAName, m.teamAId, input.teams);
    const teamB = getOrCreateTeam(teamMap, m.teamBName, m.teamBId, input.teams);

    teamA.played += 1;
    teamB.played += 1;
    teamA.pointsFor += m.scoreA;
    teamA.pointsAgainst += m.scoreB;
    teamB.pointsFor += m.scoreB;
    teamB.pointsAgainst += m.scoreA;

    if (m.scoreA > m.scoreB) {
      teamA.wins += 1;
      teamB.losses += 1;
    } else if (m.scoreB > m.scoreA) {
      teamB.wins += 1;
      teamA.losses += 1;
    } else {
      teamA.draws += 1;
      teamB.draws += 1;
    }
  }

  for (const m of inProgress) {
    getOrCreateTeam(teamMap, m.teamAName, m.teamAId, input.teams);
    getOrCreateTeam(teamMap, m.teamBName, m.teamBId, input.teams);
  }

  const teams = [...teamMap.values()]
    .map((t) => ({
      ...t,
      winRate: matchWinRatePercent(t.wins, t.played),
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.pointsFor - a.pointsFor;
    });

  const teamByName = new Map(teams.map((t) => [t.name, t]));

  const players = input.players ?? [];

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.teamWins !== a.teamWins) return b.teamWins - a.teamWins;
    return a.displayName.localeCompare(b.displayName);
  });

  const avgDurationSeconds =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  return {
    totalPlayers: input.totalPlayers,
    activeTeams,
    completedMatches: completed.length,
    inProgressMatches: inProgress.length,
    avgDurationSeconds,
    teams,
    players: sortedPlayers,
  };
}

export function formatStatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
