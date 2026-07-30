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

export function parseDoubleStageSettings(raw: unknown): DoubleStageSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DOUBLE_STAGE_SETTINGS };
  const v = raw as Record<string, unknown>;
  const phase = v.phase === "knockout" ? "knockout" : "group";
  return {
    phase,
    maxTeamsPerGroup:
      typeof v.maxTeamsPerGroup === "number" && v.maxTeamsPerGroup >= 2
        ? Math.floor(v.maxTeamsPerGroup)
        : DEFAULT_DOUBLE_STAGE_SETTINGS.maxTeamsPerGroup,
    teamsAdvancePerGroup:
      typeof v.teamsAdvancePerGroup === "number" && v.teamsAdvancePerGroup >= 1
        ? Math.floor(v.teamsAdvancePerGroup)
        : DEFAULT_DOUBLE_STAGE_SETTINGS.teamsAdvancePerGroup,
    bestRunnerUpSlots:
      typeof v.bestRunnerUpSlots === "number" && v.bestRunnerUpSlots >= 0
        ? Math.floor(v.bestRunnerUpSlots)
        : 0,
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
