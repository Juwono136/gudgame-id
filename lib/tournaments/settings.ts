import {
  RACE_TO_GAMES_OPTIONS,
  MATCH_SCORE_MODES,
  DEFAULT_GAME_RULES_BY_UNIT,
  type MatchScoreMode,
  type RaceToGames,
  type MatchGameRules,
} from "@/lib/tournaments/scoring/game-mode";
import { isUuid } from "@/lib/domain/uuid";
import {
  normalizeAllowedTierLevels,
  resolveAllowedTierLevels,
} from "@/lib/tournaments/tier-restrictions";
import type { PlayerTierLevel } from "@/lib/player/tier";
import {
  getDefaultStandingsScoringForSport,
  parseDoubleStageSettings,
  parseStandingsScoring,
  DEFAULT_DOUBLE_STAGE_SETTINGS,
  type DoubleStageSettings,
  type StandingsScoringConfig,
} from "@/lib/tournaments/scoring/config";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  coerceRichHtmlField,
  sanitizeTournamentRichField,
} from "@/lib/wiki/sanitize-rich-text";

export type TournamentRuleSections = {
  eligibilityHtml?: string;
  matchFormatHtml?: string;
  equipmentStandardsHtml?: string;
  gearEntityIds?: string[];
};

export type TournamentDeuceConfig = {
  deuceEnabled: boolean;
  deuceThreshold: number;
  winBy: number;
  maxScore: number;
};

export type TournamentDisplayLayout =
  | "single"
  | "multi_court"
  | "bracket"
  | "leaderboard"
  | "rotation";

export type TournamentDisplayConfig = {
  layout: TournamentDisplayLayout;
  courtIds?: string[];
  rotationIntervalSec?: number;
  /** When true, venue display cycles through rotationLayouts automatically. */
  autoRotate?: boolean;
  rotationLayouts?: TournamentDisplayLayout[];
  showUpcoming?: boolean;
  showHighlights?: boolean;
};

export type TournamentSettings = TournamentRuleSections & {
  venueMapsUrl?: string;
  /** Skill tiers allowed to register (official free + fun match). */
  allowedTierLevels?: PlayerTierLevel[];
  /** Max playable rounds for reclub sessions (set at creation). */
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  /**
   * How each match is scored:
   * - points: flat race-to-N points (default)
   * - games: race-to-N games with intra-game rally points (padel / tennis style)
   */
  matchScoreMode?: MatchScoreMode;
  /** Target games to win a match when matchScoreMode = "games" (typically 4 or 6). */
  raceToGames?: RaceToGames;
  /**
   * Intra-game decider when both sides reach game point.
   * golden_point = next point wins (common in padel); advantage = win by 2.
   */
  gameDecider?: "golden_point" | "advantage";
  courtCount?: number;
  deuceConfig?: TournamentDeuceConfig;
  roundDurationMinutes?: number;
  displayConfig?: TournamentDisplayConfig;
  officialStaff?: OfficialTournamentStaffMember[];
  bracketSeedMode?: "random" | "manual";
  bracketSeedingFinalized?: boolean;
  doubleStage?: DoubleStageSettings;
  standingsScoring?: StandingsScoringConfig;
};

export const TOURNAMENT_SCORING_TYPES = ["points", "timed"] as const;
export type TournamentScoringType = (typeof TOURNAMENT_SCORING_TYPES)[number];

export const TOURNAMENT_POINTS_PER_MATCH_OPTIONS = [
  11, 15, 21, 25, 30, 35, 40,
] as const;
export const TOURNAMENT_COURT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const;
export const TOURNAMENT_ROUND_DURATION_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export const DEFAULT_SUDDEN_DEATH_EXTENSION_MINUTES = 3;

export function defaultDeuceConfig(pointsPerMatch: number): TournamentDeuceConfig {
  return {
    deuceEnabled: true,
    deuceThreshold: Math.max(1, pointsPerMatch - 1),
    winBy: 2,
    maxScore: Math.max(30, pointsPerMatch + 9),
  };
}

function parseDeuceConfig(raw: unknown, pointsPerMatch: number): TournamentDeuceConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const defaults = defaultDeuceConfig(pointsPerMatch);
  return {
    deuceEnabled: typeof v.deuceEnabled === "boolean" ? v.deuceEnabled : defaults.deuceEnabled,
    deuceThreshold:
      typeof v.deuceThreshold === "number" && v.deuceThreshold > 0
        ? Math.floor(v.deuceThreshold)
        : defaults.deuceThreshold,
    winBy:
      typeof v.winBy === "number" && v.winBy > 0 ? Math.floor(v.winBy) : defaults.winBy,
    maxScore:
      typeof v.maxScore === "number" && v.maxScore > 0
        ? Math.floor(v.maxScore)
        : defaults.maxScore,
  };
}

function parseDisplayConfig(raw: unknown): TournamentDisplayConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const layout = v.layout;
  const validLayouts: TournamentDisplayLayout[] = [
    "single",
    "multi_court",
    "bracket",
    "leaderboard",
    "rotation",
  ];
  if (typeof layout !== "string" || !validLayouts.includes(layout as TournamentDisplayLayout)) {
    return undefined;
  }
  const courtIds = Array.isArray(v.courtIds)
    ? v.courtIds.filter((id): id is string => typeof id === "string" && isUuid(id))
    : undefined;
  const rotationLayouts = Array.isArray(v.rotationLayouts)
    ? v.rotationLayouts.filter(
        (l): l is TournamentDisplayLayout =>
          typeof l === "string" && validLayouts.includes(l as TournamentDisplayLayout),
      )
    : undefined;
  return {
    layout: layout as TournamentDisplayLayout,
    courtIds: courtIds?.length ? courtIds : undefined,
    rotationIntervalSec:
      typeof v.rotationIntervalSec === "number" && v.rotationIntervalSec >= 5
        ? Math.floor(v.rotationIntervalSec)
        : undefined,
    autoRotate: typeof v.autoRotate === "boolean" ? v.autoRotate : undefined,
    rotationLayouts: rotationLayouts?.length ? rotationLayouts : undefined,
    showUpcoming: typeof v.showUpcoming === "boolean" ? v.showUpcoming : undefined,
    showHighlights: typeof v.showHighlights === "boolean" ? v.showHighlights : undefined,
  };
}

export function getTournamentFormatLabel(format: string | null | undefined): string {
  if (format === "americano") return "Americano";
  if (format === "double_stage") return "Double Stage";
  return "Elimination";
}

export function getScoringTypeLabel(scoringType: string | null | undefined): string {
  return scoringType === "timed" ? "Timed rounds" : "Points";
}

/** Primary scoring label for cards and summaries (e.g. "21 points" or "Race to 4"). */
export function getTournamentScoringPrimaryLabel(tournament: TournamentDetail): string {
  if (getTournamentScoringType(tournament) === "timed") {
    return `${getTournamentRoundDurationMinutes(tournament)} min rounds`;
  }
  if (getTournamentMatchScoreMode(tournament) === "games") {
    return formatRaceToLabel(getTournamentRaceToGames(tournament));
  }
  return `${getTournamentPointsPerMatch(tournament)} points`;
}

function formatRaceToLabel(n: number): string {
  return `Race to ${n}`;
}

/** Secondary scoring line with type and court count. */
export function getTournamentScoringDetailLabel(tournament: TournamentDetail): string {
  const courtCount = getTournamentCourtCount(tournament);
  const courts = `${courtCount} ${courtCount === 1 ? "court" : "courts"}`;
  const mode =
    getTournamentMatchScoreMode(tournament) === "games"
      ? formatRaceToLabel(getTournamentRaceToGames(tournament))
      : getScoringTypeLabel(getTournamentScoringType(tournament));
  return `${mode} · ${courts}`;
}

/** Short hint for match scoring (bracket readiness, live toolbar). */
export function getTournamentMatchScoringHint(tournament: TournamentDetail): string {
  if (getTournamentScoringType(tournament) === "timed") {
    return `${getTournamentRoundDurationMinutes(tournament)} min per round`;
  }
  if (getTournamentMatchScoreMode(tournament) === "games") {
    return `First to ${getTournamentRaceToGames(tournament)} games`;
  }
  return `First to ${getTournamentPointsPerMatch(tournament)} pts`;
}

export type OfficialTournamentStaffRole = "host" | "scorekeeper";

export type OfficialTournamentStaffMember = {
  userId: string;
  email: string;
  name: string;
  role: OfficialTournamentStaffRole;
  invitedAt: string;
  invitedByUserId: string;
};

export function parseTournamentSettings(
  raw: Record<string, unknown> | null | undefined,
): TournamentSettings {
  if (!raw || typeof raw !== "object") return {};

  const venueMapsUrl = raw.venueMapsUrl;
  const eligibilityHtml = raw.eligibilityHtml;
  const matchFormatHtml = raw.matchFormatHtml;
  const equipmentStandardsHtml = raw.equipmentStandardsHtml;
  const gearEntityIds = raw.gearEntityIds;
  const maxRounds = raw.maxRounds;
  const scoringType = raw.scoringType;
  const pointsPerMatch = raw.pointsPerMatch;
  const courtCount = raw.courtCount;
  const officialStaff = raw.officialStaff;
  const deuceConfig = raw.deuceConfig;
  const roundDurationMinutes = raw.roundDurationMinutes;
  const displayConfig = raw.displayConfig;
  const bracketSeedMode = raw.bracketSeedMode;
  const bracketSeedingFinalized = raw.bracketSeedingFinalized;
  const doubleStage = raw.doubleStage;
  const standingsScoring = raw.standingsScoring;
  const matchScoreMode = raw.matchScoreMode;
  const raceToGames = raw.raceToGames;
  const gameDecider = raw.gameDecider;
  const allowedTierLevels = raw.allowedTierLevels;

  const parsedPoints =
    typeof pointsPerMatch === "number" && Number.isFinite(pointsPerMatch) && pointsPerMatch > 0
      ? Math.floor(pointsPerMatch)
      : undefined;

  const parsedRaceTo =
    typeof raceToGames === "number" &&
    RACE_TO_GAMES_OPTIONS.includes(raceToGames as RaceToGames)
      ? (raceToGames as RaceToGames)
      : undefined;

  const parsedGearIds = Array.isArray(gearEntityIds)
    ? gearEntityIds
        .map((id) => (typeof id === "string" ? id.trim() : String(id)))
        .filter((id) => isUuid(id))
    : undefined;

  return {
    venueMapsUrl:
      typeof venueMapsUrl === "string" && venueMapsUrl.trim() ? venueMapsUrl : undefined,
    eligibilityHtml: coerceRichHtmlField(
      typeof eligibilityHtml === "string" ? eligibilityHtml : null,
    ) ?? undefined,
    matchFormatHtml: coerceRichHtmlField(
      typeof matchFormatHtml === "string" ? matchFormatHtml : null,
    ) ?? undefined,
    equipmentStandardsHtml: coerceRichHtmlField(
      typeof equipmentStandardsHtml === "string" ? equipmentStandardsHtml : null,
    ) ?? undefined,
    gearEntityIds: parsedGearIds?.length ? parsedGearIds : undefined,
    maxRounds:
      typeof maxRounds === "number" && Number.isFinite(maxRounds) && maxRounds > 0
        ? Math.floor(maxRounds)
        : undefined,
    scoringType:
      scoringType === "points" || scoringType === "timed" ? scoringType : undefined,
    pointsPerMatch: parsedPoints,
    matchScoreMode:
      typeof matchScoreMode === "string" &&
      MATCH_SCORE_MODES.includes(matchScoreMode as MatchScoreMode)
        ? (matchScoreMode as MatchScoreMode)
        : undefined,
    raceToGames: parsedRaceTo,
    gameDecider:
      gameDecider === "golden_point" || gameDecider === "advantage"
        ? gameDecider
        : undefined,
    courtCount:
      typeof courtCount === "number" && Number.isFinite(courtCount) && courtCount > 0
        ? Math.floor(courtCount)
        : undefined,
    deuceConfig: parseDeuceConfig(deuceConfig, parsedPoints ?? 21),
    roundDurationMinutes:
      typeof roundDurationMinutes === "number" &&
      Number.isFinite(roundDurationMinutes) &&
      roundDurationMinutes > 0
        ? Math.floor(roundDurationMinutes)
        : undefined,
    displayConfig: parseDisplayConfig(displayConfig),
    officialStaff: parseOfficialTournamentStaff(officialStaff),
    bracketSeedMode:
      bracketSeedMode === "random" || bracketSeedMode === "manual"
        ? bracketSeedMode
        : undefined,
    bracketSeedingFinalized:
      typeof bracketSeedingFinalized === "boolean" ? bracketSeedingFinalized : undefined,
    doubleStage: parseDoubleStageSettings(doubleStage),
    standingsScoring: parseStandingsScoring(standingsScoring),
    allowedTierLevels: normalizeAllowedTierLevels(allowedTierLevels),
  };
}

export function parseOfficialTournamentStaff(
  raw: unknown,
): OfficialTournamentStaffMember[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const seen = new Set<string>();
  const staff = raw
    .map((item): OfficialTournamentStaffMember | null => {
      if (!item || typeof item !== "object") return null;
      const value = item as Record<string, unknown>;
      const userId = typeof value.userId === "string" ? value.userId.trim() : "";
      const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const role = value.role === "host" ? "host" : value.role === "scorekeeper" ? "scorekeeper" : null;
      const invitedAt =
        typeof value.invitedAt === "string" && value.invitedAt.trim()
          ? value.invitedAt.trim()
          : null;
      const invitedByUserId =
        typeof value.invitedByUserId === "string" ? value.invitedByUserId.trim() : "";

      if (!userId || !email || !name || !role || !invitedAt || !invitedByUserId) {
        return null;
      }
      if (seen.has(userId)) return null;
      seen.add(userId);
      return { userId, email, name, role, invitedAt, invitedByUserId };
    })
    .filter((item): item is OfficialTournamentStaffMember => item != null);

  return staff.length ? staff : undefined;
}

export function getOfficialTournamentStaff(
  tournament: TournamentDetail,
): OfficialTournamentStaffMember[] {
  return parseTournamentSettings(tournament.settings).officialStaff ?? [];
}

export function getTournamentAllowedTierLevels(
  tournament: TournamentDetail,
): PlayerTierLevel[] | null {
  const configured = parseTournamentSettings(tournament.settings).allowedTierLevels;
  return resolveAllowedTierLevels(
    tournament.tournamentType,
    tournament.officialBilling,
    configured,
  );
}

export function isOfficialTournamentStaff(
  tournament: TournamentDetail,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  return getOfficialTournamentStaff(tournament).some((member) => member.userId === userId);
}

export function getMaxRounds(tournament: TournamentDetail): number | null {
  return parseTournamentSettings(tournament.settings).maxRounds ?? null;
}

export function getVenueMapsUrl(tournament: TournamentDetail): string | null {
  return parseTournamentSettings(tournament.settings).venueMapsUrl ?? null;
}

export function getTournamentScoringType(tournament: TournamentDetail): TournamentScoringType {
  return parseTournamentSettings(tournament.settings).scoringType ?? "points";
}

export function getTournamentPointsPerMatch(tournament: TournamentDetail): number {
  return parseTournamentSettings(tournament.settings).pointsPerMatch ?? 21;
}

/**
 * Match scoring shape.
 * Prefer explicit settings (matchScoreMode / raceToGames) so legacy flat-point
 * padel tournaments are not forced into games mode mid-event.
 * New double-stage creates set matchScoreMode via buildFormatSpecificSettingsFromUpsert.
 */
export function getTournamentMatchScoreMode(
  tournament: TournamentDetail,
): MatchScoreMode {
  const settings = parseTournamentSettings(tournament.settings);
  if (settings.matchScoreMode) return settings.matchScoreMode;
  if (settings.raceToGames) return "games";
  return "points";
}

export function getTournamentRaceToGames(tournament: TournamentDetail): RaceToGames {
  const settings = parseTournamentSettings(tournament.settings);
  if (settings.raceToGames) return settings.raceToGames;
  const unit = settings.standingsScoring?.scoreUnit
    ?? getDefaultStandingsScoringForSport(tournament.sportSlug).scoreUnit;
  if (unit === "sets") return 2 as RaceToGames; // best of 3 ≈ race to 2 (stored; UI still offers 4/6 for games)
  return DEFAULT_GAME_RULES_BY_UNIT.games.raceToGames;
}

export function getTournamentGameRules(tournament: TournamentDetail): MatchGameRules {
  const settings = parseTournamentSettings(tournament.settings);
  const unit = settings.standingsScoring?.scoreUnit
    ?? getDefaultStandingsScoringForSport(tournament.sportSlug).scoreUnit;
  const base =
    unit === "sets" ? DEFAULT_GAME_RULES_BY_UNIT.sets : DEFAULT_GAME_RULES_BY_UNIT.games;
  return {
    ...base,
    raceToGames: getTournamentRaceToGames(tournament),
    // Sequential 0→40 (+1 per point). Never use tennis 15/30/40 jumps for operators.
    pointsToWinGame: base.pointsToWinGame,
    pointStyle: "simple",
    gameDecider: settings.gameDecider ?? base.gameDecider,
  };
}

export function getTournamentCourtCount(tournament: TournamentDetail): number {
  return parseTournamentSettings(tournament.settings).courtCount ?? 1;
}

export function getTournamentDeuceConfig(tournament: TournamentDetail): TournamentDeuceConfig {
  const settings = parseTournamentSettings(tournament.settings);
  const points = settings.pointsPerMatch ?? 21;
  return settings.deuceConfig ?? defaultDeuceConfig(points);
}

export function getTournamentRoundDurationMinutes(tournament: TournamentDetail): number {
  return parseTournamentSettings(tournament.settings).roundDurationMinutes ?? 15;
}

export function getBracketSeedMode(
  tournament: TournamentDetail,
): "random" | "manual" | null {
  return parseTournamentSettings(tournament.settings).bracketSeedMode ?? null;
}

export function isBracketSeedingFinalized(tournament: TournamentDetail): boolean {
  const settings = parseTournamentSettings(tournament.settings);
  if (settings.bracketSeedingFinalized != null) {
    return settings.bracketSeedingFinalized;
  }
  return settings.bracketSeedMode === "random";
}

export function getTournamentDisplayConfig(tournament: TournamentDetail): TournamentDisplayConfig {
  return (
    parseTournamentSettings(tournament.settings).displayConfig ?? {
      layout: "single",
      showUpcoming: true,
      showHighlights: true,
    }
  );
}

export function getTournamentRuleSections(
  tournament: TournamentDetail,
): TournamentRuleSections {
  const settings = parseTournamentSettings(tournament.settings);
  return {
    eligibilityHtml: settings.eligibilityHtml,
    matchFormatHtml: settings.matchFormatHtml ?? tournament.rules ?? undefined,
    equipmentStandardsHtml: settings.equipmentStandardsHtml,
    gearEntityIds: settings.gearEntityIds,
  };
}

export type TournamentSettingsInput = {
  venueMapsUrl?: string;
  eligibilityHtml?: string;
  matchFormatHtml?: string;
  equipmentStandardsHtml?: string;
  gearEntityIds?: string[];
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  matchScoreMode?: MatchScoreMode;
  raceToGames?: RaceToGames;
  gameDecider?: "golden_point" | "advantage";
  courtCount?: number;
  deuceConfig?: TournamentDeuceConfig;
  roundDurationMinutes?: number;
  displayConfig?: TournamentDisplayConfig;
  doubleStage?: DoubleStageSettings;
  standingsScoring?: StandingsScoringConfig;
  allowedTierLevels?: PlayerTierLevel[];
};

export type TournamentSettingsUpsertFields = {
  venueMapsUrl?: string;
  eligibilityRules?: string;
  matchFormatRules?: string;
  equipmentStandardsRules?: string;
  gearEntityIds?: string[];
  rules?: string;
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  matchScoreMode?: MatchScoreMode;
  raceToGames?: RaceToGames;
  gameDecider?: "golden_point" | "advantage";
  courtCount?: number;
  deuceConfig?: TournamentDeuceConfig;
  roundDurationMinutes?: number;
  displayConfig?: TournamentDisplayConfig;
  doubleStage?: DoubleStageSettings;
  standingsScoring?: StandingsScoringConfig;
  allowedTierLevels?: PlayerTierLevel[];
  format?: string;
  maxTeamsPerGroup?: number;
  teamsAdvancePerGroup?: number;
  allowDraw?: boolean;
  winPoints?: number;
  drawPoints?: number;
  lossPoints?: number;
  thirdPlaceEnabled?: boolean;
};

export function buildFormatSpecificSettingsFromUpsert(
  input: TournamentSettingsUpsertFields,
  sportSlug: string,
): Pick<
  TournamentSettingsInput,
  "doubleStage" | "standingsScoring" | "matchScoreMode" | "raceToGames" | "gameDecider"
> {
  if (input.format !== "double_stage") return {};

  const sportDefaults = getDefaultStandingsScoringForSport(sportSlug);
  const usesGames = sportDefaults.scoreUnit === "games" || sportDefaults.scoreUnit === "sets";
  const defaultRace =
    input.raceToGames ??
    (sportDefaults.scoreUnit === "sets"
      ? DEFAULT_GAME_RULES_BY_UNIT.sets.raceToGames
      : DEFAULT_GAME_RULES_BY_UNIT.games.raceToGames);

  return {
    doubleStage: {
      ...DEFAULT_DOUBLE_STAGE_SETTINGS,
      maxTeamsPerGroup: input.maxTeamsPerGroup ?? DEFAULT_DOUBLE_STAGE_SETTINGS.maxTeamsPerGroup,
      teamsAdvancePerGroup:
        input.teamsAdvancePerGroup ?? DEFAULT_DOUBLE_STAGE_SETTINGS.teamsAdvancePerGroup,
      thirdPlaceEnabled: input.thirdPlaceEnabled ?? false,
    },
    standingsScoring: {
      ...sportDefaults,
      allowDraw: input.allowDraw ?? sportDefaults.allowDraw,
      winPoints: input.winPoints ?? sportDefaults.winPoints,
      drawPoints: input.drawPoints ?? sportDefaults.drawPoints,
      lossPoints: input.lossPoints ?? sportDefaults.lossPoints,
    },
    matchScoreMode: input.matchScoreMode ?? (usesGames ? "games" : "points"),
    raceToGames: usesGames || input.matchScoreMode === "games" ? defaultRace : undefined,
    gameDecider:
      input.gameDecider ??
      (sportDefaults.scoreUnit === "sets"
        ? DEFAULT_GAME_RULES_BY_UNIT.sets.gameDecider
        : DEFAULT_GAME_RULES_BY_UNIT.games.gameDecider),
  };
}

export function settingsInputFromUpsert(
  input: TournamentSettingsUpsertFields,
  sportSlug?: string,
): TournamentSettingsInput {
  const formatSpecific =
    sportSlug != null ? buildFormatSpecificSettingsFromUpsert(input, sportSlug) : {};
  return {
    venueMapsUrl: input.venueMapsUrl,
    eligibilityHtml: input.eligibilityRules,
    matchFormatHtml: input.matchFormatRules || input.rules,
    equipmentStandardsHtml: input.equipmentStandardsRules,
    gearEntityIds: input.gearEntityIds,
    maxRounds: input.maxRounds,
    scoringType: input.scoringType,
    pointsPerMatch: input.pointsPerMatch,
    matchScoreMode: input.matchScoreMode ?? formatSpecific.matchScoreMode,
    raceToGames: input.raceToGames ?? formatSpecific.raceToGames,
    gameDecider: input.gameDecider ?? formatSpecific.gameDecider,
    courtCount: input.courtCount,
    deuceConfig: input.deuceConfig,
    roundDurationMinutes: input.roundDurationMinutes,
    displayConfig: input.displayConfig,
    doubleStage: input.doubleStage ?? formatSpecific.doubleStage,
    standingsScoring: input.standingsScoring ?? formatSpecific.standingsScoring,
    allowedTierLevels: input.allowedTierLevels,
  };
}

export function buildTournamentSettings(
  existing: Record<string, unknown> | undefined,
  input: TournamentSettingsInput,
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };

  if (input.venueMapsUrl?.trim()) {
    next.venueMapsUrl = input.venueMapsUrl.trim();
  } else if ("venueMapsUrl" in input) {
    delete next.venueMapsUrl;
  }

  const textFields = [
    ["eligibilityHtml", input.eligibilityHtml],
    ["matchFormatHtml", input.matchFormatHtml],
    ["equipmentStandardsHtml", input.equipmentStandardsHtml],
  ] as const;

  for (const [key, value] of textFields) {
    const sanitized = sanitizeTournamentRichField(value);
    if (sanitized) {
      next[key] = sanitized;
    } else if (key in input) {
      delete next[key];
    }
  }

  if (input.gearEntityIds?.length) {
    next.gearEntityIds = input.gearEntityIds;
  } else if ("gearEntityIds" in input) {
    delete next.gearEntityIds;
  }

  if (input.maxRounds != null && input.maxRounds > 0) {
    next.maxRounds = Math.floor(input.maxRounds);
  } else if ("maxRounds" in input) {
    delete next.maxRounds;
  }

  if (input.scoringType === "points" || input.scoringType === "timed") {
    next.scoringType = input.scoringType;
  } else if ("scoringType" in input) {
    delete next.scoringType;
  }

  if (input.pointsPerMatch != null && input.pointsPerMatch > 0) {
    next.pointsPerMatch = Math.floor(input.pointsPerMatch);
  } else if ("pointsPerMatch" in input) {
    delete next.pointsPerMatch;
  }

  if (input.matchScoreMode === "points" || input.matchScoreMode === "games") {
    next.matchScoreMode = input.matchScoreMode;
  } else if ("matchScoreMode" in input) {
    delete next.matchScoreMode;
  }

  if (
    input.raceToGames != null &&
    RACE_TO_GAMES_OPTIONS.includes(input.raceToGames as RaceToGames)
  ) {
    next.raceToGames = input.raceToGames;
  } else if ("raceToGames" in input) {
    delete next.raceToGames;
  }

  if (input.gameDecider === "golden_point" || input.gameDecider === "advantage") {
    next.gameDecider = input.gameDecider;
  } else if ("gameDecider" in input) {
    delete next.gameDecider;
  }

  if (input.courtCount != null && input.courtCount > 0) {
    next.courtCount = Math.floor(input.courtCount);
  } else if ("courtCount" in input) {
    delete next.courtCount;
  }

  if (input.deuceConfig) {
    next.deuceConfig = input.deuceConfig;
  } else if ("deuceConfig" in input) {
    delete next.deuceConfig;
  }

  if (input.roundDurationMinutes != null && input.roundDurationMinutes > 0) {
    next.roundDurationMinutes = Math.floor(input.roundDurationMinutes);
  } else if ("roundDurationMinutes" in input) {
    delete next.roundDurationMinutes;
  }

  if (input.displayConfig) {
    next.displayConfig = input.displayConfig;
  } else if ("displayConfig" in input) {
    delete next.displayConfig;
  }

  if (input.doubleStage) {
    next.doubleStage = input.doubleStage;
  } else if ("doubleStage" in input) {
    delete next.doubleStage;
  }

  if (input.standingsScoring) {
    next.standingsScoring = input.standingsScoring;
  } else if ("standingsScoring" in input) {
    delete next.standingsScoring;
  }

  if (input.allowedTierLevels?.length) {
    next.allowedTierLevels = input.allowedTierLevels;
  } else if ("allowedTierLevels" in input) {
    delete next.allowedTierLevels;
  }

  return next;
}
