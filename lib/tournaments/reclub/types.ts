import type { ReclubScoreEvent } from "@/lib/tournaments/reclub/score-events";

export type ReclubMatchView = {
  id: string; roundNumber: number;
  teamAId?: string | null;
  teamBId?: string | null;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  durationSeconds: number | null;
  summary: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  courtId: string | null;
  timerEndsAt: string | null;
  teamAPlayers: string[];
  teamBPlayers: string[];
  scoreEvents: ReclubScoreEvent[];
  sourceKind?: "round" | "bracket";
  bracketMatchId?: string | null;
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

/** Minimal bracket row shape for merging into reclub session stats (client-safe). */
export type BracketMatchStatsSource = {
  id: string;
  roundNumber: number;
  matchNumber?: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA: number | null;
  scoreB: number | null;
  status: string;
};

export function bracketMatchToReclubView(m: BracketMatchStatsSource): ReclubMatchView {
  return {
    id: m.id,
    roundNumber: m.roundNumber,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    durationSeconds: null,
    summary: null,
    status: m.status,
    startedAt: null,
    endedAt: null,
    courtId: null,
    timerEndsAt: null,
    teamAPlayers: m.teamAPlayers ?? [],
    teamBPlayers: m.teamBPlayers ?? [],
    scoreEvents: [],
    sourceKind: "bracket",
    bracketMatchId: m.id,
    roundLabel:
      m.matchNumber != null
        ? `Round ${m.roundNumber} · Match ${m.matchNumber}`
        : `Round ${m.roundNumber}`,
  };
}
