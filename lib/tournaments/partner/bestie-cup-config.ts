/**
 * Bestie Cup 2026 / partner pool presets (see docs/Panduan Dan Rundown Bestie Cup 2026.pdf).
 */
import type { TieBreakerKey } from "@/lib/tournaments/scoring/config";
import type { StandingsScoringConfig } from "@/lib/tournaments/scoring/config";
import type { MatchGameRules } from "@/lib/tournaments/scoring/game-mode";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  composeDoubleStageMatchScoring,
  type MatchScoringConfig,
} from "@/lib/tournaments/match-config";

/** Full event capacity (48 pairs → 16 pools × 3). */
export const BESTIE_CUP_TOTAL_PAIRS = 48;
export const BESTIE_CUP_POOL_COUNT = 16;
export const BESTIE_CUP_PAIRS_PER_POOL = 3;

/** Fixed R16 cross-pairings (Pool A vs I, B vs J, …). */
export const BESTIE_CUP_R16_GROUP_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["A", "I"],
  ["B", "J"],
  ["C", "K"],
  ["D", "L"],
  ["E", "M"],
  ["F", "N"],
  ["G", "O"],
  ["H", "P"],
];

/** Pool ranking when match wins are tied (Bestie Cup §5). */
export const BESTIE_CUP_POOL_TIE_BREAKERS: TieBreakerKey[] = [
  "wins",
  "gameWinPct",
  "manual",
];

export const BESTIE_CUP_POOL_STANDINGS: StandingsScoringConfig = {
  allowDraw: false,
  winPoints: 1,
  drawPoints: 0,
  lossPoints: 0,
  scoreUnit: "games",
  tieBreakers: BESTIE_CUP_POOL_TIE_BREAKERS,
  knockoutAllowDraw: false,
};

/** Pool stage: First to 6 games, Golden Point at deuce, 5–5 → deciding game (6–5). */
export const BESTIE_CUP_POOL_GAME_RULES: MatchGameRules = {
  raceToGames: 6,
  lengthMode: "race_to",
  pointsToWinGame: 40,
  gameDecider: "golden_point",
  pointStyle: "simple",
  sideChangeOnOddGameTotal: true,
  sideChangeRestSeconds: 60,
};

/** R16 & QF: FT6; at 5–5 → match tiebreak to 7 points. */
export const BESTIE_CUP_KO_EARLY_GAME_RULES: MatchGameRules = {
  raceToGames: 6,
  lengthMode: "race_to",
  pointsToWinGame: 40,
  gameDecider: "golden_point",
  pointStyle: "simple",
  matchWinMargin: 1,
  matchTiebreakAt: 5,
  matchTiebreakTo: 7,
  sideChangeOnOddGameTotal: true,
  sideChangeRestSeconds: 60,
};

/** SF & Final: FT6 win by 2; at 6–6 → match tiebreak to 7 points. */
export const BESTIE_CUP_KO_LATE_GAME_RULES: MatchGameRules = {
  raceToGames: 6,
  lengthMode: "race_to",
  pointsToWinGame: 40,
  gameDecider: "golden_point",
  pointStyle: "simple",
  matchWinMargin: 2,
  matchTiebreakAt: 6,
  matchTiebreakTo: 7,
  sideChangeOnOddGameTotal: true,
  sideChangeRestSeconds: 60,
};

export function defaultModifiedSwissMatchScoring(): MatchScoringConfig {
  return { mode: "race_to", raceTo: { value: BESTIE_CUP_POOL_GAME_RULES.raceToGames } };
}

/** Double Stage: group & knockout both race to 6 (round-specific KO rules applied at runtime). */
export function defaultBestieCupDoubleStageMatchScoring(): MatchScoringConfig {
  const leaf = { mode: "race_to" as const, raceTo: { value: 6 as const } };
  return composeDoubleStageMatchScoring(leaf, leaf);
}

/** Wizard / public summary lines aligned with PDF § Sistem Skor. */
export const BESTIE_CUP_SCORING_SUMMARY = {
  deuce: "Golden Point at 40–40 (receiving pair chooses side)",
  pool: "First to 6 · Golden Point · at 5–5 → deciding game (6–5)",
  knockoutEarly: "R16 & QF: First to 6 · Golden Point · at 5–5 → tiebreak to 7 (no win-by-2 in TB)",
  knockoutLate: "SF & Final: First to 6 win by 2 · Golden Point · at 6–6 → tiebreak to 7 (no win-by-2 in TB)",
} as const;

export function summarizeBestieCupScoringDetail(): string {
  return [
    BESTIE_CUP_SCORING_SUMMARY.pool,
    BESTIE_CUP_SCORING_SUMMARY.knockoutEarly,
    BESTIE_CUP_SCORING_SUMMARY.knockoutLate,
  ].join(" · ");
}

export function parseGroupLetter(groupName: string): string | null {
  const trimmed = groupName.trim();
  const m = /^Group\s+([A-Z])/i.exec(trimmed) ?? /^([A-Z])$/.exec(trimmed);
  return m?.[1]?.toUpperCase() ?? null;
}

/** Knockout rules by bracket round (1 = R16, …, totalRounds = Final). */
export function getBestieCupKnockoutGameRules(
  roundNumber: number,
  totalRounds: number,
): MatchGameRules {
  const isLateRound = totalRounds >= 2 && roundNumber >= totalRounds - 1;
  return isLateRound ? { ...BESTIE_CUP_KO_LATE_GAME_RULES } : { ...BESTIE_CUP_KO_EARLY_GAME_RULES };
}

export function usesBestieCupPoolRules(format: string | null | undefined): boolean {
  return format === "modified_swiss";
}

export function tournamentUsesBestieCupPoolRules(
  tournament: Pick<TournamentDetail, "format" | "settings">,
): boolean {
  if (usesBestieCupPoolRules(tournament.format)) return true;
  const raw = tournament.settings as Record<string, unknown> | null | undefined;
  return raw?.poolRules === "bestie_cup";
}

export function getBestieCupStandingsScoring(
  base?: Partial<StandingsScoringConfig>,
): StandingsScoringConfig {
  return { ...BESTIE_CUP_POOL_STANDINGS, ...base };
}

export function formatGameWinPctDisplay(
  row: Pick<
    { gamesFor: number; gamesAgainst: number; scoreFor: number; scoreAgainst: number },
    "gamesFor" | "gamesAgainst" | "scoreFor" | "scoreAgainst"
  >,
): string {
  const gamesPlayed = row.gamesFor + row.gamesAgainst;
  const gamesWon = row.gamesFor;
  if (gamesPlayed <= 0) {
    const fallback = row.scoreFor + row.scoreAgainst;
    if (fallback <= 0) return "0.00";
    return ((row.scoreFor / fallback) * 100).toFixed(2);
  }
  return ((gamesWon / gamesPlayed) * 100).toFixed(2);
}

/** Recommended partner wizard defaults for the full Bestie Cup event. */
export function bestieCupWizardDefaults(): {
  format: "double_stage";
  formatFamily: "original";
  maxTeams: number;
  maxTeamsPerGroup: number;
  teamsAdvancePerGroup: number;
  bestRunnerUpSlots: number;
  thirdPlaceEnabled: boolean;
  courtCount: number;
  poolRules: "bestie_cup";
  matchFormat: "race_to_games";
} {
  return {
    format: "double_stage",
    formatFamily: "original",
    maxTeams: BESTIE_CUP_TOTAL_PAIRS,
    maxTeamsPerGroup: BESTIE_CUP_PAIRS_PER_POOL,
    teamsAdvancePerGroup: 1,
    bestRunnerUpSlots: 0,
    thirdPlaceEnabled: false,
    courtCount: 5,
    poolRules: "bestie_cup",
    matchFormat: "race_to_games",
  };
}
