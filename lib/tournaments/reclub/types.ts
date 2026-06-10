import type { ReclubScoreEvent } from "@/lib/tournaments/reclub/score-events";

export type ReclubMatchView = {
  id: number;
  roundNumber: number;
  teamAId?: number | null;
  teamBId?: number | null;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  durationSeconds: number | null;
  summary: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  teamAPlayers: string[];
  teamBPlayers: string[];
  scoreEvents: ReclubScoreEvent[];
  sourceKind?: "round" | "bracket";
  bracketMatchId?: number | null;
  roundLabel?: string | null;
};

export type ReclubMatchesListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: "all" | "completed" | "in_progress";
};

export function getReclubMatchHistoryKey(match: ReclubMatchView): string {
  if (match.bracketMatchId != null) return `bracket-${match.bracketMatchId}`;
  return `round-${match.id}`;
}
