import type { AmericanoMatchPairing } from "@/lib/tournaments/americano/types";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import { resolveBracketMatchDurationSeconds } from "@/lib/tournaments/stats/bracket-duration";
import type { ReclubScoreEvent } from "@/lib/tournaments/reclub/score-events";

export type ReclubPlayType = "round" | "friendly" | "bracket" | "bracket_rematch" | "group_stage";

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
  sourceKind?: "round" | "bracket" | "group_stage";
  bracketMatchId?: string | null;
  roundLabel?: string | null;
  playType?: ReclubPlayType | null;
  playNumber?: number | null;
  /** Individual player IDs for each side when format is Americano (2v2). */
  americanoPairing?: AmericanoMatchPairing | null;
  /** Intra-game rally state for race-to-N games matches. */
  gameState?: import("@/lib/tournaments/scoring/game-mode").MatchGameState | null;
};

export type ReclubMatchesListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: "all" | "completed" | "in_progress";
};

export function getReclubMatchHistoryKey(match: ReclubMatchView): string {
  if (match.bracketMatchId != null) {
    const play = match.playNumber ?? 1;
    return `bracket-${match.bracketMatchId}-play-${play}`;
  }
  if (match.sourceKind === "bracket") {
    const play = match.playNumber ?? 1;
    return `bracket-${match.id}-play-${play}`;
  }
  return `round-${match.id}`;
}

function matchDedupeScore(m: ReclubMatchView): number {
  let score = 0;
  if (m.status === "in_progress") score += 100;
  if (m.courtId) score += 40;
  if (m.teamAPlayers?.length || m.teamBPlayers?.length) score += 25;
  if (m.teamAId && m.teamBId) score += 20;
  if (m.id !== m.bracketMatchId) score += 15;
  if (m.durationSeconds != null) score += 10;
  if (m.endedAt) score += 5;
  return score;
}

export function pickBetterReclubMatch(a: ReclubMatchView, b: ReclubMatchView): ReclubMatchView {
  const scoreA = matchDedupeScore(a);
  const scoreB = matchDedupeScore(b);
  if (scoreB !== scoreA) return scoreB > scoreA ? b : a;
  return {
    ...a,
    ...b,
    teamAName: b.teamAName ?? a.teamAName,
    teamBName: b.teamBName ?? a.teamBName,
    teamAPlayers: b.teamAPlayers?.length ? b.teamAPlayers : a.teamAPlayers,
    teamBPlayers: b.teamBPlayers?.length ? b.teamBPlayers : a.teamBPlayers,
    courtId: b.courtId ?? a.courtId,
    teamAId: b.teamAId ?? a.teamAId,
    teamBId: b.teamBId ?? a.teamBId,
    scoreA: b.scoreA ?? a.scoreA,
    scoreB: b.scoreB ?? a.scoreB,
    durationSeconds: b.durationSeconds ?? a.durationSeconds,
    endedAt: b.endedAt ?? a.endedAt,
    roundLabel: b.roundLabel ?? a.roundLabel,
  };
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
  scheduledAt?: string | null;
  completedAt?: string | null;
  startedAt?: string | null;
  scoreEvents?: MatchScoreEvent[];
  gameState?: import("@/lib/tournaments/scoring/game-mode").MatchGameState | null;
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
    durationSeconds: resolveBracketMatchDurationSeconds(m),
    summary: null,
    status: m.status,
    startedAt: m.scheduledAt ?? m.startedAt ?? null,
    endedAt: m.completedAt ?? null,
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
    gameState: m.gameState ?? null,
  };
}
