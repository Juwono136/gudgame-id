import { computeTournamentSessionStats } from "@/lib/tournaments/stats/compute";
import type {
  StatsMatchInput,
  StatsTeamInput,
  TournamentPlayerStatRow,
  TournamentSessionStats,
} from "@/lib/tournaments/stats/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import {
  bracketMatchToReclubView,
  getReclubMatchHistoryKey,
  type ReclubMatchView,
} from "@/lib/tournaments/reclub/types";

function toStatsMatch(match: ReclubMatchView): StatsMatchInput | null {
  if (!match.teamAName || !match.teamBName || match.status === "bye") return null;

  return {
    id: match.id,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamAId: match.teamAId ?? null,
    teamBId: match.teamBId ?? null,
    scoreA: match.scoreA ?? 0,
    scoreB: match.scoreB ?? 0,
    status: match.status,
    durationSeconds: match.durationSeconds,
  };
}

function toStatsTeams(teams: LobbyTeamView[]): StatsTeamInput[] {
  return teams
    .filter((t) => t.memberCount > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t.memberCount,
    }));
}

function buildPlayers(teams: LobbyTeamView[], stats: TournamentSessionStats): TournamentPlayerStatRow[] {
  const teamByName = new Map(stats.teams.map((t) => [t.name, t]));

  const players: TournamentPlayerStatRow[] = [];
  for (const team of teams) {
    if (team.memberCount === 0) continue;
    const teamStat = teamByName.get(team.name);
    for (const member of team.members) {
      players.push({
        userId: member.userId,
        displayName: member.displayName,
        teamName: team.name,
        teamWins: teamStat?.wins ?? 0,
        teamLosses: teamStat?.losses ?? 0,
        teamPlayed: teamStat?.played ?? 0,
        teamPointsFor: teamStat?.pointsFor ?? 0,
        teamPointsAgainst: teamStat?.pointsAgainst ?? 0,
        image: member.image ?? null,
      });
    }
  }

  return players;
}

export function computeReclubSessionStats(input: {
  matches: ReclubMatchView[];
  teams: LobbyTeamView[];
  totalPlayers: number;
  maxRounds: number | null;
}): TournamentSessionStats {
  void input.maxRounds;

  const teams = toStatsTeams(input.teams);
  const seen = new Set<string>();
  const matches: StatsMatchInput[] = [];

  for (const match of input.matches) {
    const normalized = toStatsMatch(match);
    if (!normalized) continue;
    const key = getReclubMatchHistoryKey(match);
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(normalized);
  }

  const base = computeTournamentSessionStats({
    matches,
    teams,
    totalPlayers: input.totalPlayers,
  });

  return {
    ...base,
    players: buildPlayers(input.teams, base),
  };
}

/** Lobby rounds plus bracket finals for fun-match elimination stats. */
export function computeReclubSessionStatsWithBracket(input: {
  reclubMatches: ReclubMatchView[];
  bracketMatches: import("@/lib/tournaments/reclub/types").BracketMatchStatsSource[];
  teams: LobbyTeamView[];
  totalPlayers: number;
  maxRounds: number | null;
}): TournamentSessionStats {
  const seen = new Set<string>();
  const merged: ReclubMatchView[] = [];

  for (const match of [...input.reclubMatches, ...input.bracketMatches.map(bracketMatchToReclubView)]) {
    const key = getReclubMatchHistoryKey(match);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(match);
  }

  return computeReclubSessionStats({
    matches: merged,
    teams: input.teams,
    totalPlayers: input.totalPlayers,
    maxRounds: input.maxRounds,
  });
}
