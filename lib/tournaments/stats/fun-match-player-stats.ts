import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";

export type FunMatchPlayerLeaderboardRow = {
  userId: string;
  name: string;
  teamName: string;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
};

/**
 * Player-level stats from completed squad matches.
 * Each squad member on a team gets credit for that squad's result in the match.
 */
export function computeFunMatchPlayerLeaderboard(
  matches: ReclubMatchView[],
  teams: LobbyTeamView[],
): FunMatchPlayerLeaderboardRow[] {
  const playerMeta = new Map<string, { name: string; teamName: string }>();
  for (const team of teams) {
    for (const m of team.members ?? []) {
      playerMeta.set(m.userId, {
        name: m.displayName ?? "Player",
        teamName: team.name,
      });
    }
  }

  const stats = new Map<string, FunMatchPlayerLeaderboardRow>();

  function ensure(userId: string, fallbackName: string, teamName: string) {
    if (!stats.has(userId)) {
      const meta = playerMeta.get(userId);
      stats.set(userId, {
        userId,
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
    return stats.get(userId)!;
  }

  const completed = matches.filter((m) => m.status === "completed");

  function findTeam(match: ReclubMatchView, side: "a" | "b") {
    const teamId = side === "a" ? match.teamAId : match.teamBId;
    const teamName = side === "a" ? match.teamAName : match.teamBName;
    if (teamId) {
      const byId = teams.find((t) => t.id === teamId);
      if (byId) return byId;
    }
    if (teamName) {
      return teams.find((t) => t.name === teamName) ?? null;
    }
    return null;
  }

  for (const match of completed) {
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const teamA = findTeam(match, "a");
    const teamB = findTeam(match, "b");
    const playersA = teamA?.members?.length
      ? teamA.members
      : (match.teamAPlayers ?? []).map((name, i) => ({
          userId: `lineup-a-${match.id}-${i}`,
          displayName: name,
        }));
    const playersB = teamB?.members?.length
      ? teamB.members
      : (match.teamBPlayers ?? []).map((name, i) => ({
          userId: `lineup-b-${match.id}-${i}`,
          displayName: name,
        }));

    const aWon = scoreA > scoreB;
    const bWon = scoreB > scoreA;
    const tied = scoreA === scoreB;

    for (const p of playersA) {
      const row = ensure(p.userId, p.displayName ?? "Player", match.teamAName ?? "Squad");
      row.games += 1;
      row.pointsFor += scoreA;
      row.pointsAgainst += scoreB;
      if (tied) row.ties += 1;
      else if (aWon) row.wins += 1;
      else row.losses += 1;
      row.points += aWon ? 3 : tied ? 1 : 0;
    }

    for (const p of playersB) {
      const row = ensure(p.userId, p.displayName ?? "Player", match.teamBName ?? "Squad");
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
    .map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.wins - a.wins);
}
