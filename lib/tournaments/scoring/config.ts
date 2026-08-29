export const TIE_BREAKER_OPTIONS = [
  "points",
  "wins",
  "scoreDiff",
  "scoreFor",
  "matchesPlayed",
  "setWinPct",
  "gameWinPct",
  "headToHead",
  "manual",
] as const;

export type TieBreakerKey = (typeof TIE_BREAKER_OPTIONS)[number];

export const SCORE_UNITS = ["points", "games", "goals", "sets"] as const;
export type ScoreUnit = (typeof SCORE_UNITS)[number];

export type StandingsScoringConfig = {
  allowDraw: boolean;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  scoreUnit: ScoreUnit;
  tieBreakers: TieBreakerKey[];
  knockoutAllowDraw: boolean;
};

/** Default for points/goals sports. */
export const DEFAULT_TIE_BREAKERS: TieBreakerKey[] = [
  "points",
  "wins",
  "scoreDiff",
  "scoreFor",
  "headToHead",
  "manual",
];

/**
 * ITF / FIP round-robin standings (padel & tennis):
 * wins → matchesPlayed → headToHead (2 only) → setWinPct → gameWinPct → manual
 * Multi-way ties re-enter H2H when a later % key reduces the subset to 2.
 */
export const GAMES_SPORT_TIE_BREAKERS: TieBreakerKey[] = [
  "wins",
  "matchesPlayed",
  "headToHead",
  "setWinPct",
  "gameWinPct",
  "manual",
];

/** @deprecated alias — same as GAMES_SPORT_TIE_BREAKERS */
export const ITF_ROUND_ROBIN_TIE_BREAKERS = GAMES_SPORT_TIE_BREAKERS;

export const DEFAULT_STANDINGS_SCORING: StandingsScoringConfig = {
  allowDraw: false,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  scoreUnit: "points",
  tieBreakers: DEFAULT_TIE_BREAKERS,
  knockoutAllowDraw: false,
};

const SPORT_STANDINGS_OVERRIDES: Record<string, Partial<StandingsScoringConfig>> = {
  padel: {
    allowDraw: false,
    scoreUnit: "games",
    winPoints: 1,
    drawPoints: 0,
    lossPoints: 0,
    tieBreakers: GAMES_SPORT_TIE_BREAKERS,
  },
  tennis: {
    allowDraw: false,
    scoreUnit: "sets",
    winPoints: 1,
    drawPoints: 0,
    lossPoints: 0,
    tieBreakers: GAMES_SPORT_TIE_BREAKERS,
  },
  badminton: { allowDraw: false, scoreUnit: "points" },
  futsal: { allowDraw: true, scoreUnit: "goals" },
  football: { allowDraw: true, scoreUnit: "goals" },
  basketball: { allowDraw: false, scoreUnit: "points" },
  chess: { allowDraw: true, winPoints: 1, drawPoints: 0.5, lossPoints: 0 },
};

export function getDefaultStandingsScoringForSport(sportSlug: string): StandingsScoringConfig {
  const override = SPORT_STANDINGS_OVERRIDES[sportSlug.toLowerCase()] ?? {};
  return {
    ...DEFAULT_STANDINGS_SCORING,
    ...override,
    tieBreakers: override.tieBreakers ?? DEFAULT_TIE_BREAKERS,
  };
}

export function parseStandingsScoring(raw: unknown): StandingsScoringConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STANDINGS_SCORING };
  const v = raw as Record<string, unknown>;
  const tieBreakers = Array.isArray(v.tieBreakers)
    ? v.tieBreakers.filter(
        (t): t is TieBreakerKey =>
          typeof t === "string" && TIE_BREAKER_OPTIONS.includes(t as TieBreakerKey),
      )
    : DEFAULT_TIE_BREAKERS;
  const scoreUnit =
    typeof v.scoreUnit === "string" && SCORE_UNITS.includes(v.scoreUnit as ScoreUnit)
      ? (v.scoreUnit as ScoreUnit)
      : DEFAULT_STANDINGS_SCORING.scoreUnit;
  return {
    allowDraw: typeof v.allowDraw === "boolean" ? v.allowDraw : DEFAULT_STANDINGS_SCORING.allowDraw,
    winPoints:
      typeof v.winPoints === "number" && Number.isFinite(v.winPoints)
        ? v.winPoints
        : DEFAULT_STANDINGS_SCORING.winPoints,
    drawPoints:
      typeof v.drawPoints === "number" && Number.isFinite(v.drawPoints)
        ? v.drawPoints
        : DEFAULT_STANDINGS_SCORING.drawPoints,
    lossPoints:
      typeof v.lossPoints === "number" && Number.isFinite(v.lossPoints)
        ? v.lossPoints
        : DEFAULT_STANDINGS_SCORING.lossPoints,
    scoreUnit,
    tieBreakers: tieBreakers.length ? tieBreakers : DEFAULT_TIE_BREAKERS,
    knockoutAllowDraw:
      typeof v.knockoutAllowDraw === "boolean"
        ? v.knockoutAllowDraw
        : DEFAULT_STANDINGS_SCORING.knockoutAllowDraw,
  };
}

export type DoubleStagePhase = "group" | "knockout";

export type DoubleStageSettings = {
  phase: DoubleStagePhase;
  maxTeamsPerGroup: number;
  teamsAdvancePerGroup: number;
  /** Extra KO slots filled by best runners-up across all pools (0 = off). */
  bestRunnerUpSlots?: number;
  groupsLockedAt?: string;
  knockoutReadyAt?: string;
  knockoutGeneratedAt?: string;
  thirdPlaceEnabled?: boolean;
};

export const DEFAULT_DOUBLE_STAGE_SETTINGS: DoubleStageSettings = {
  phase: "group",
  maxTeamsPerGroup: 4,
  teamsAdvancePerGroup: 2,
  bestRunnerUpSlots: 0,
  thirdPlaceEnabled: false,
};

/**
 * Parse double-stage pool settings.
 * Accepts either the nested `settings.doubleStage` object **or** a full tournament
 * settings blob (unwraps `.doubleStage` when present) so UI callers stay resilient.
 */
export function parseDoubleStageSettings(raw: unknown): DoubleStageSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DOUBLE_STAGE_SETTINGS };
  let v = raw as Record<string, unknown>;

  // Full tournament settings often get passed by mistake — unwrap nested doubleStage.
  const nested = v.doubleStage;
  const hasTopLevelPool =
    typeof v.maxTeamsPerGroup === "number" ||
    typeof v.teamsAdvancePerGroup === "number" ||
    typeof v.maxTeamsPerGroup === "string" ||
    typeof v.teamsAdvancePerGroup === "string";
  if (nested != null && typeof nested === "object" && !hasTopLevelPool) {
    v = nested as Record<string, unknown>;
  }

  const phase = v.phase === "knockout" ? "knockout" : "group";
  const maxTeamsPerGroup = coercePositiveInt(v.maxTeamsPerGroup, 2);
  const teamsAdvancePerGroup = coercePositiveInt(v.teamsAdvancePerGroup, 1);
  const bestRunnerUpSlots = coerceNonNegInt(v.bestRunnerUpSlots);

  return {
    phase,
    maxTeamsPerGroup:
      maxTeamsPerGroup ?? DEFAULT_DOUBLE_STAGE_SETTINGS.maxTeamsPerGroup,
    teamsAdvancePerGroup:
      teamsAdvancePerGroup ?? DEFAULT_DOUBLE_STAGE_SETTINGS.teamsAdvancePerGroup,
    bestRunnerUpSlots: bestRunnerUpSlots ?? 0,
    groupsLockedAt:
      typeof v.groupsLockedAt === "string" && v.groupsLockedAt.trim()
        ? v.groupsLockedAt
        : undefined,
    knockoutReadyAt:
      typeof v.knockoutReadyAt === "string" && v.knockoutReadyAt.trim()
        ? v.knockoutReadyAt
        : undefined,
    knockoutGeneratedAt:
      typeof v.knockoutGeneratedAt === "string" && v.knockoutGeneratedAt.trim()
        ? v.knockoutGeneratedAt
        : undefined,
    thirdPlaceEnabled:
      typeof v.thirdPlaceEnabled === "boolean" ? v.thirdPlaceEnabled : false,
  };
}

function coercePositiveInt(raw: unknown, min: number): number | null {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(n) || n < min) return null;
  return Math.floor(n);
}

function coerceNonNegInt(raw: unknown): number | null {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}
