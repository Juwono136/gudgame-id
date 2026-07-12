import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import type { StatsMatchInput } from "@/lib/tournaments/stats/types";

export function groupMatchDurationSeconds(match: GroupMatchView): number | null {
  if (!match.startedAt || !match.completedAt) return null;
  return Math.max(
    0,
    Math.floor(
      (new Date(match.completedAt).getTime() - new Date(match.startedAt).getTime()) / 1000,
    ),
  );
}

export function toStatsMatchFromGroup(match: GroupMatchView): StatsMatchInput | null {
  if (!match.teamAName || !match.teamBName) return null;
  return {
    id: match.id,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    scoreA: match.scoreA ?? 0,
    scoreB: match.scoreB ?? 0,
    status: match.status,
    durationSeconds: groupMatchDurationSeconds(match),
  };
}
