import type { MexicanoLeaderboardEntry } from "@/lib/tournaments/mexicano/round-planner";

/** Map reclub/official round results into mexicano leaderboard rows for public/manage UI. */
export function mexicanoLeaderboardFromPlayerPoints(
  entries: Array<{
    userId: string;
    displayName: string;
    points: number;
    wins?: number;
    losses?: number;
  }>,
): MexicanoLeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))
    .map((e, index) => ({
      playerId: e.userId,
      name: e.displayName,
      points: e.points,
      wins: e.wins ?? 0,
      losses: e.losses ?? 0,
      rank: index + 1,
    }));
}
