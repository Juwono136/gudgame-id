import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { uniquePlayerNames } from "@/lib/format/player-names";
import {
  computeFunMatchPlayerLeaderboard,
  type FunMatchPlayerLeaderboardRow,
} from "@/lib/tournaments/stats/fun-match-player-stats";

export type FunMatchStandingsRow = FunMatchPlayerLeaderboardRow & {
  winRate: number;
  compensationPoints: number;
  missedGames: number;
};

export type FunMatchSquadStandingsRow = {
  teamId: string;
  name: string;
  memberCount: number;
  members: string[];
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
  winRate: number;
  compensationPoints: number;
  missedGames: number;
};

function withCompensation<T extends { games: number }>(
  rows: T[],
): (T & { compensationPoints: number; missedGames: number; winRate: number })[] {
  const maxGames = Math.max(...rows.map((r) => r.games), 0);
  return rows.map((row) => {
    const missedGames = Math.max(0, maxGames - row.games);
    return {
      ...row,
      missedGames,
      compensationPoints: missedGames,
      winRate:
        "wins" in row && row.games > 0
          ? Math.round((((row as { wins: number }).wins / row.games) * 100 + Number.EPSILON) * 10) / 10
          : 0,
    };
  });
}

export function enrichPlayerStandings(
  rows: FunMatchPlayerLeaderboardRow[],
): FunMatchStandingsRow[] {
  return withCompensation(rows).sort(
    (a, b) =>
      b.points + b.compensationPoints - (a.points + a.compensationPoints) ||
      b.diff - a.diff ||
      b.wins - a.wins,
  );
}

export function computeFunMatchSquadStandings(
  matches: ReclubMatchView[],
  teams: LobbyTeamView[],
): FunMatchSquadStandingsRow[] {
  const stats = new Map<string, FunMatchSquadStandingsRow>();

  for (const team of teams) {
    if (team.memberCount === 0) continue;
    stats.set(team.id, {
      teamId: team.id,
      name: team.name,
      memberCount: team.memberCount,
      members: uniquePlayerNames((team.members ?? []).map((m) => m.displayName ?? "Player")),
      games: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      points: 0,
      winRate: 0,
      compensationPoints: 0,
      missedGames: 0,
    });
  }

  const completed = matches.filter((m) => m.status === "completed");

  for (const match of completed) {
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const aWon = scoreA > scoreB;
    const bWon = scoreB > scoreA;
    const tied = scoreA === scoreB;

    const rowA =
      (match.teamAId ? stats.get(match.teamAId) : null) ??
      [...stats.values()].find((r) => r.name === match.teamAName) ??
      null;
    const rowB =
      (match.teamBId ? stats.get(match.teamBId) : null) ??
      [...stats.values()].find((r) => r.name === match.teamBName) ??
      null;

    if (rowA) {
      rowA.games += 1;
      rowA.pointsFor += scoreA;
      rowA.pointsAgainst += scoreB;
      if (tied) rowA.ties += 1;
      else if (aWon) rowA.wins += 1;
      else rowA.losses += 1;
      rowA.points += aWon ? 3 : tied ? 1 : 0;
    }
    if (rowB) {
      rowB.games += 1;
      rowB.pointsFor += scoreB;
      rowB.pointsAgainst += scoreA;
      if (tied) rowB.ties += 1;
      else if (bWon) rowB.wins += 1;
      else rowB.losses += 1;
      rowB.points += bWon ? 3 : tied ? 1 : 0;
    }
  }

  const base = [...stats.values()].map((r) => ({
    ...r,
    diff: r.pointsFor - r.pointsAgainst,
  }));

  return withCompensation(base).sort(
    (a, b) =>
      b.points + b.compensationPoints - (a.points + a.compensationPoints) ||
      b.diff - a.diff ||
      b.wins - a.wins,
  ) as FunMatchSquadStandingsRow[];
}

export function computeFunMatchStandings(
  matches: ReclubMatchView[],
  teams: LobbyTeamView[],
  options?: { americano?: boolean },
): { players: FunMatchStandingsRow[]; squads: FunMatchSquadStandingsRow[] } {
  const players = enrichPlayerStandings(
    computeFunMatchPlayerLeaderboard(matches, teams, { americano: options?.americano }),
  );
  const squads = computeFunMatchSquadStandings(matches, teams);
  return { players, squads };
}
