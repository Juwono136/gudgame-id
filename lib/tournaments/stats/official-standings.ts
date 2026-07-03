import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import {
  isSyntheticLineupUserId,
  uniquePlayerNames,
} from "@/lib/format/player-names";
import {
  computeFunMatchSquadStandings,
  type FunMatchSquadStandingsRow,
} from "@/lib/tournaments/stats/fun-match-standings";
import {
  computeFunMatchPlayerLeaderboard,
  type FunMatchPlayerLeaderboardRow,
} from "@/lib/tournaments/stats/fun-match-player-stats";

export type OfficialPlayerPointLog = {
  userId: string;
  displayName: string;
  teamId: string | null;
  teamName: string;
  events: MatchScoreEvent[];
  pointsScored: number;
  scoringActions: number;
};

export type OfficialPlayerStandingRow = FunMatchPlayerLeaderboardRow & {
  winRate: number;
  pointsScored: number;
  scoringActions: number;
  avgPointsPerGame: number;
};

export type OfficialSquadStandingRow = FunMatchSquadStandingsRow;

type LineupMember = { userId: string; displayName: string };

function buildTeamMemberIndex(teams: LobbyTeamView[]) {
  const byUserId = new Map<string, { teamId: string; teamName: string; displayName: string }>();
  for (const team of teams) {
    for (const member of team.members ?? []) {
      if (!member.userId) continue;
      byUserId.set(member.userId, {
        teamId: team.id,
        teamName: team.name,
        displayName: member.displayName ?? "Player",
      });
    }
  }
  return byUserId;
}

function collectEvents(
  bracketMatches: BracketMatchView[],
  reclubMatches: ReclubMatchView[],
): Map<string, MatchScoreEvent[]> {
  const byUser = new Map<string, MatchScoreEvent[]>();

  const push = (userId: string, event: MatchScoreEvent) => {
    const list = byUser.get(userId) ?? [];
    byUser.set(userId, [...list, event]);
  };

  for (const m of bracketMatches) {
    for (const e of m.scoreEvents ?? []) push(e.userId, e);
  }
  for (const m of reclubMatches) {
    for (const e of m.scoreEvents ?? []) push(e.userId, e);
  }

  return byUser;
}

function pointsScoredFromEvents(events: MatchScoreEvent[]): number {
  return events.filter((e) => e.action === "increment").length;
}

function findTeam(
  teams: LobbyTeamView[],
  teamId: string | null | undefined,
  teamName: string | null | undefined,
) {
  if (teamId) {
    const byId = teams.find((t) => t.id === teamId);
    if (byId) return byId;
  }
  if (teamName) {
    return teams.find((t) => t.name === teamName) ?? null;
  }
  return null;
}

function memberKey(userId: string, displayName: string): string {
  if (!isSyntheticLineupUserId(userId)) return `id:${userId}`;
  return `name:${displayName.trim().toLowerCase()}`;
}

function uniqueLineupMembers(members: LineupMember[]): LineupMember[] {
  const seen = new Set<string>();
  const result: LineupMember[] = [];
  for (const member of members) {
    const key = memberKey(member.userId, member.displayName);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(member);
  }
  return result;
}

function lineupMembers(
  team: LobbyTeamView | null,
  playerNames: string[] | undefined,
  matchId: string,
  side: "a" | "b",
): LineupMember[] {
  if (team?.members?.length) {
    return uniqueLineupMembers(
      team.members.map((member) => ({
        userId: member.userId,
        displayName: member.displayName ?? "Player",
      })),
    );
  }
  return uniqueLineupMembers(
    uniquePlayerNames(playerNames).map((name, index) => ({
      userId: `lineup-${matchId}-${side}-${index}`,
      displayName: name,
    })),
  );
}

function computeBracketPlayerLeaderboard(
  matches: BracketMatchView[],
  teams: LobbyTeamView[],
): FunMatchPlayerLeaderboardRow[] {
  const playerMeta = new Map<string, { name: string; teamName: string }>();
  for (const team of teams) {
    for (const member of team.members ?? []) {
      playerMeta.set(memberKey(member.userId, member.displayName ?? "Player"), {
        name: member.displayName ?? "Player",
        teamName: team.name,
      });
    }
  }

  const stats = new Map<string, FunMatchPlayerLeaderboardRow>();

  function ensure(userId: string, fallbackName: string, teamName: string) {
    const key = memberKey(userId, fallbackName);
    if (!stats.has(key)) {
      const meta = playerMeta.get(key);
      stats.set(key, {
        userId: isSyntheticLineupUserId(userId) ? key : userId,
        name: meta?.name ?? fallbackName,
        teamName: meta?.teamName ?? teamName,
        games: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        points: 0,
      });
    }
    return stats.get(key)!;
  }

  const completed = matches.filter((m) => m.status === "completed");

  for (const match of completed) {
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const teamA = findTeam(teams, match.teamAId, match.teamAName);
    const teamB = findTeam(teams, match.teamBId, match.teamBName);
    const playersA = lineupMembers(teamA, match.teamAPlayers, match.id, "a");
    const playersB = lineupMembers(teamB, match.teamBPlayers, match.id, "b");
    const aWon = scoreA > scoreB;
    const bWon = scoreB > scoreA;
    const tied = scoreA === scoreB;

    for (const player of playersA) {
      const row = ensure(
        player.userId,
        player.displayName ?? "Player",
        match.teamAName ?? teamA?.name ?? "Squad",
      );
      row.games += 1;
      row.pointsFor += scoreA;
      row.pointsAgainst += scoreB;
      if (tied) row.ties += 1;
      else if (aWon) row.wins += 1;
      else row.losses += 1;
      row.points += aWon ? 3 : tied ? 1 : 0;
    }

    for (const player of playersB) {
      const row = ensure(
        player.userId,
        player.displayName ?? "Player",
        match.teamBName ?? teamB?.name ?? "Squad",
      );
      row.games += 1;
      row.pointsFor += scoreB;
      row.pointsAgainst += scoreA;
      if (tied) row.ties += 1;
      else if (bWon) row.wins += 1;
      else row.losses += 1;
      row.points += bWon ? 3 : tied ? 1 : 0;
    }
  }

  return [...stats.values()]
    .map((row) => ({ ...row, diff: row.pointsFor - row.pointsAgainst }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.wins - a.wins);
}

function computeBracketSquadStandings(
  matches: BracketMatchView[],
  teams: LobbyTeamView[],
): FunMatchSquadStandingsRow[] {
  const stats = new Map<string, FunMatchSquadStandingsRow>();

  for (const team of teams) {
    if (team.memberCount === 0 && !team.members?.length) continue;
    stats.set(team.id, {
      teamId: team.id,
      name: team.name,
      memberCount: team.memberCount || team.members.length,
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

  function ensureSquad(
    teamId: string | null | undefined,
    teamName: string | null | undefined,
    playerNames?: string[],
  ) {
    if (!teamId || !teamName || stats.has(teamId)) return;
    stats.set(teamId, {
      teamId,
      name: teamName,
      memberCount: uniquePlayerNames(playerNames).length,
      members: uniquePlayerNames(playerNames),
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

  for (const match of completed) {
    ensureSquad(match.teamAId, match.teamAName, match.teamAPlayers);
    ensureSquad(match.teamBId, match.teamBName, match.teamBPlayers);

    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const aWon = scoreA > scoreB;
    const bWon = scoreB > scoreA;
    const tied = scoreA === scoreB;

    const rowA =
      (match.teamAId ? stats.get(match.teamAId) : null) ??
      [...stats.values()].find((row) => row.name === match.teamAName) ??
      null;
    const rowB =
      (match.teamBId ? stats.get(match.teamBId) : null) ??
      [...stats.values()].find((row) => row.name === match.teamBName) ??
      null;

    if (rowA) {
      rowA.members = uniquePlayerNames([
        ...rowA.members,
        ...(match.teamAPlayers ?? []),
      ]);
      rowA.memberCount = rowA.members.length;
      rowA.games += 1;
      rowA.pointsFor += scoreA;
      rowA.pointsAgainst += scoreB;
      if (tied) rowA.ties += 1;
      else if (aWon) rowA.wins += 1;
      else rowA.losses += 1;
      rowA.points += aWon ? 3 : tied ? 1 : 0;
    }
    if (rowB) {
      rowB.members = uniquePlayerNames([
        ...rowB.members,
        ...(match.teamBPlayers ?? []),
      ]);
      rowB.memberCount = rowB.members.length;
      rowB.games += 1;
      rowB.pointsFor += scoreB;
      rowB.pointsAgainst += scoreA;
      if (tied) rowB.ties += 1;
      else if (bWon) rowB.wins += 1;
      else rowB.losses += 1;
      rowB.points += bWon ? 3 : tied ? 1 : 0;
    }
  }

  const maxGames = Math.max(...[...stats.values()].map((row) => row.games), 0);

  return [...stats.values()]
    .map((row) => {
      const missedGames = Math.max(0, maxGames - row.games);
      return {
        ...row,
        members: uniquePlayerNames(row.members),
        memberCount: uniquePlayerNames(row.members).length,
        diff: row.pointsFor - row.pointsAgainst,
        missedGames,
        compensationPoints: missedGames,
        winRate:
          row.games > 0
            ? Math.round(((row.wins / row.games) * 100 + Number.EPSILON) * 10) / 10
            : 0,
      };
    })
    .sort(
      (a, b) =>
        b.points + b.compensationPoints - (a.points + a.compensationPoints) ||
        b.diff - a.diff ||
        b.wins - a.wins,
    );
}

function playerStandingKey(row: Pick<FunMatchPlayerLeaderboardRow, "name" | "teamName">): string {
  return `${row.teamName.trim().toLowerCase()}::${row.name.trim().toLowerCase()}`;
}

function mergePlayerRows(
  reclubRows: FunMatchPlayerLeaderboardRow[],
  bracketRows: FunMatchPlayerLeaderboardRow[],
): FunMatchPlayerLeaderboardRow[] {
  const merged = new Map<string, FunMatchPlayerLeaderboardRow>();
  for (const row of [...reclubRows, ...bracketRows]) {
    const key = playerStandingKey(row);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row });
      continue;
    }
    if (isSyntheticLineupUserId(existing.userId) && !isSyntheticLineupUserId(row.userId)) {
      existing.userId = row.userId;
    }
    existing.games += row.games;
    existing.wins += row.wins;
    existing.losses += row.losses;
    existing.ties += row.ties;
    existing.pointsFor += row.pointsFor;
    existing.pointsAgainst += row.pointsAgainst;
    existing.points += row.points;
    existing.diff = existing.pointsFor - existing.pointsAgainst;
  }
  return [...merged.values()].sort(
    (a, b) => b.points - a.points || b.diff - a.diff || b.wins - a.wins,
  );
}

function mergeSquadRows(
  reclubRows: FunMatchSquadStandingsRow[],
  bracketRows: FunMatchSquadStandingsRow[],
): FunMatchSquadStandingsRow[] {
  const merged = new Map<string, FunMatchSquadStandingsRow>();
  for (const row of [...reclubRows, ...bracketRows]) {
    const existing = merged.get(row.teamId);
    if (!existing) {
      merged.set(row.teamId, { ...row, members: uniquePlayerNames(row.members) });
      continue;
    }
    existing.games += row.games;
    existing.wins += row.wins;
    existing.losses += row.losses;
    existing.ties += row.ties;
    existing.pointsFor += row.pointsFor;
    existing.pointsAgainst += row.pointsAgainst;
    existing.points += row.points;
    existing.diff = existing.pointsFor - existing.pointsAgainst;
    existing.members = uniquePlayerNames([...existing.members, ...row.members]);
    existing.memberCount = existing.members.length;
  }

  const maxGames = Math.max(...[...merged.values()].map((row) => row.games), 0);
  return [...merged.values()]
    .map((row) => {
      const missedGames = Math.max(0, maxGames - row.games);
      return {
        ...row,
        members: uniquePlayerNames(row.members),
        memberCount: uniquePlayerNames(row.members).length,
        missedGames,
        compensationPoints: missedGames,
        winRate:
          row.games > 0
            ? Math.round(((row.wins / row.games) * 100 + Number.EPSILON) * 10) / 10
            : 0,
      };
    })
    .sort(
      (a, b) =>
        b.points + b.compensationPoints - (a.points + a.compensationPoints) ||
        b.diff - a.diff ||
        b.wins - a.wins,
    );
}


export function computeOfficialPlayerStandings(
  bracketMatches: BracketMatchView[],
  reclubMatches: ReclubMatchView[],
  teams: LobbyTeamView[],
): {
  players: OfficialPlayerStandingRow[];
  squads: OfficialSquadStandingRow[];
  pointLogs: OfficialPlayerPointLog[];
} {
  const completedReclub = reclubMatches.filter((m) => m.status === "completed");
  const completedBracket = bracketMatches.filter((m) => m.status === "completed");

  const reclubSquads = computeFunMatchSquadStandings(completedReclub, teams);
  const bracketSquads = computeBracketSquadStandings(completedBracket, teams);
  const squads = mergeSquadRows(reclubSquads, bracketSquads);

  const reclubPlayers = computeFunMatchPlayerLeaderboard(completedReclub, teams);
  const bracketPlayers = computeBracketPlayerLeaderboard(completedBracket, teams);
  const basePlayers = mergePlayerRows(reclubPlayers, bracketPlayers);

  const memberIndex = buildTeamMemberIndex(teams);
  const eventsByUser = collectEvents(
    bracketMatches.filter((m) => m.status === "completed" || m.status === "in_progress"),
    reclubMatches.filter((m) => m.status === "completed" || m.status === "in_progress"),
  );

  const players: OfficialPlayerStandingRow[] = basePlayers
    .map((row) => {
      const events = eventsByUser.get(row.userId) ?? [];
      const pointsScored = pointsScoredFromEvents(events);
      return {
        ...row,
        winRate:
          row.games > 0
            ? Math.round(((row.wins / row.games) * 100 + Number.EPSILON) * 10) / 10
            : 0,
        pointsScored,
        scoringActions: events.filter((e) => e.action === "increment").length,
        avgPointsPerGame: row.games > 0 ? Math.round((pointsScored / row.games) * 10) / 10 : 0,
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points || b.diff - a.diff || b.pointsScored - a.pointsScored,
    );

  const pointLogs: OfficialPlayerPointLog[] = [...eventsByUser.entries()]
    .map(([userId, events]) => {
      const member = memberIndex.get(userId);
      const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
      return {
        userId,
        displayName: member?.displayName ?? sorted.find((e) => e.userName)?.userName ?? "Player",
        teamId: member?.teamId ?? null,
        teamName: member?.teamName ?? "—",
        events: sorted,
        pointsScored: pointsScoredFromEvents(sorted),
        scoringActions: sorted.filter((e) => e.action === "increment").length,
      };
    })
    .sort((a, b) => b.scoringActions - a.scoringActions);

  return { players, squads, pointLogs };
}
