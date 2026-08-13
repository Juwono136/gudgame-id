/**
 * Official tournament match-config extensions (format family, scoring, meetings, mexicano).
 * Stored in tournaments.settings JSONB — additive / dual-read with legacy fields.
 */

export const TOURNAMENT_RANKING_MODES = ["tiered", "open"] as const;
export type TournamentRankingMode = (typeof TOURNAMENT_RANKING_MODES)[number];

export const TOURNAMENT_FORMAT_FAMILIES = ["original", "custom"] as const;
export type TournamentFormatFamily = (typeof TOURNAMENT_FORMAT_FAMILIES)[number];

export const MATCH_SCORING_MODES = [
  "best_of",
  "race_to",
  "total",
  "custom_score",
] as const;
export type MatchScoringMode = (typeof MATCH_SCORING_MODES)[number];

export const BEST_OF_OPTIONS = [3, 5] as const;
export type BestOfOption = (typeof BEST_OF_OPTIONS)[number];

export const RACE_TO_PRESETS = [4, 6] as const;
export const TOTAL_SETS_PRESETS = [3, 4, 5] as const;

export const CUSTOM_SCORE_VARIANTS = ["large_score", "one_match_winner"] as const;
export type CustomScoreVariant = (typeof CUSTOM_SCORE_VARIANTS)[number];

export const CUSTOM_SCORE_TIE_POLICIES = [
  "continue",
  "allow_draw",
  "host_tiebreak",
  "host_manual",
] as const;
export type CustomScoreTiePolicy = (typeof CUSTOM_SCORE_TIE_POLICIES)[number];

export const MEXICANO_MODES = ["individual", "team"] as const;
export type MexicanoMode = (typeof MEXICANO_MODES)[number];

/** Formats available under Original family. */
export const ORIGINAL_FORMATS = [
  "double_stage",
  "americano",
  "mexicano",
  "single_elimination",
  "group_only",
] as const;

/** Formats available under Custom family (no mexicano). */
export const CUSTOM_FORMATS = [
  "double_stage",
  "americano",
  "single_elimination",
  "group_only",
] as const;

export const OFFICIAL_CREATABLE_FORMATS = [
  "americano",
  "single_elimination",
  "double_stage",
  "mexicano",
  "group_only",
] as const;
export type OfficialCreatableFormat = (typeof OFFICIAL_CREATABLE_FORMATS)[number];

export const GROUP_MEETINGS_PER_PAIR_MIN = 1;
export const GROUP_MEETINGS_PER_PAIR_MAX = 10;
export const KNOCKOUT_LEGS_PER_SLOT_MIN = 1;
export const KNOCKOUT_LEGS_PER_SLOT_MAX = 9;
export const MEXICANO_ROUNDS_MIN = 1;
export const MEXICANO_ROUNDS_MAX = 32;
export const RACE_TO_CUSTOM_MIN = 1;
export const RACE_TO_CUSTOM_MAX = 99;

export type RaceToTarget = {
  value: number;
};

export type MatchScoringConfig = {
  mode: MatchScoringMode;
  /** Best of 3 or 5 — first to win ceil(n/2) sets. */
  bestOf?: BestOfOption;
  /** Per-set race target when mode = best_of. */
  setTarget?: RaceToTarget;
  /** Flat race-to-N when mode = race_to. */
  raceTo?: RaceToTarget;
  /** All sets must be played when mode = total. */
  totalSets?: number;
  customScore?: {
    variant: CustomScoreVariant;
    allowDraw: boolean;
    tiePolicy: CustomScoreTiePolicy;
  };
  /** Optional stage overrides (group vs knockout). */
  group?: Partial<Omit<MatchScoringConfig, "group" | "knockout">>;
  knockout?: Partial<Omit<MatchScoringConfig, "group" | "knockout">>;
};

export type CustomMatchSettings = {
  /** Independent fixtures per unordered pair in group RR. */
  groupMeetingsPerPair: number;
  /** Series legs per knockout bracket slot; majority advances. */
  knockoutLegsPerSlot: number;
};

export type MexicanoSettings = {
  mode: MexicanoMode;
  roundCount: number;
};

export function formatsForFamily(
  family: TournamentFormatFamily,
): readonly OfficialCreatableFormat[] {
  return family === "custom" ? CUSTOM_FORMATS : ORIGINAL_FORMATS;
}

export function isFormatAllowedForFamily(
  family: TournamentFormatFamily,
  format: string,
): boolean {
  return (formatsForFamily(family) as readonly string[]).includes(format);
}

export function formatHasGroupStage(format: string): boolean {
  return format === "double_stage" || format === "group_only";
}

export function formatHasKnockout(format: string): boolean {
  return format === "double_stage" || format === "single_elimination";
}

export function formatHasLobbyRounds(format: string): boolean {
  return format === "americano" || format === "mexicano";
}

function parsePositiveInt(
  raw: unknown,
  min: number,
  max: number,
): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const n = Math.floor(raw);
  if (n < min || n > max) return undefined;
  return n;
}

function parseRaceToTarget(raw: unknown): RaceToTarget | undefined {
  if (!raw || typeof raw !== "object") {
    if (typeof raw === "number") {
      const value = parsePositiveInt(raw, RACE_TO_CUSTOM_MIN, RACE_TO_CUSTOM_MAX);
      return value != null ? { value } : undefined;
    }
    return undefined;
  }
  const value = parsePositiveInt(
    (raw as { value?: unknown }).value,
    RACE_TO_CUSTOM_MIN,
    RACE_TO_CUSTOM_MAX,
  );
  return value != null ? { value } : undefined;
}

function parseMatchScoringLeaf(
  raw: Record<string, unknown>,
): Omit<MatchScoringConfig, "group" | "knockout"> | undefined {
  const mode = raw.mode;
  if (typeof mode !== "string" || !MATCH_SCORING_MODES.includes(mode as MatchScoringMode)) {
    return undefined;
  }

  const base: Omit<MatchScoringConfig, "group" | "knockout"> = {
    mode: mode as MatchScoringMode,
  };

  if (mode === "best_of") {
    const bestOf = raw.bestOf;
    if (bestOf === 3 || bestOf === 5) base.bestOf = bestOf;
    else base.bestOf = 3;
    base.setTarget = parseRaceToTarget(raw.setTarget) ?? { value: 4 };
  }

  if (mode === "race_to") {
    base.raceTo = parseRaceToTarget(raw.raceTo) ?? { value: 4 };
  }

  if (mode === "total") {
    base.totalSets =
      parsePositiveInt(raw.totalSets, 1, RACE_TO_CUSTOM_MAX) ?? 3;
  }

  if (mode === "custom_score") {
    const cs = raw.customScore;
    if (cs && typeof cs === "object") {
      const c = cs as Record<string, unknown>;
      const variant =
        c.variant === "large_score" || c.variant === "one_match_winner"
          ? c.variant
          : "one_match_winner";
      const allowDraw = typeof c.allowDraw === "boolean" ? c.allowDraw : false;
      const tiePolicy =
        typeof c.tiePolicy === "string" &&
        CUSTOM_SCORE_TIE_POLICIES.includes(c.tiePolicy as CustomScoreTiePolicy)
          ? (c.tiePolicy as CustomScoreTiePolicy)
          : allowDraw
            ? "allow_draw"
            : "continue";
      base.customScore = { variant, allowDraw, tiePolicy };
    } else {
      base.customScore = {
        variant: "one_match_winner",
        allowDraw: false,
        tiePolicy: "continue",
      };
    }
  }

  return base;
}

export function parseMatchScoringConfig(raw: unknown): MatchScoringConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const leaf = parseMatchScoringLeaf(v);
  if (!leaf) return undefined;

  const groupRaw = v.group;
  const knockoutRaw = v.knockout;
  const group =
    groupRaw && typeof groupRaw === "object"
      ? parseMatchScoringLeaf(groupRaw as Record<string, unknown>)
      : undefined;
  const knockout =
    knockoutRaw && typeof knockoutRaw === "object"
      ? parseMatchScoringLeaf(knockoutRaw as Record<string, unknown>)
      : undefined;

  return {
    ...leaf,
    group: group ?? undefined,
    knockout: knockout ?? undefined,
  };
}

/** Derive matchScoring from legacy race-to / points settings when missing. */
export function deriveMatchScoringFromLegacy(input: {
  matchScoreMode?: string;
  raceToGames?: number;
  raceToGamesGroup?: number;
  raceToGamesKnockout?: number;
  pointsPerMatch?: number;
  matchFormat?: string;
  classicBestOf?: number;
}): MatchScoringConfig {
  if (input.matchFormat === "classic_sets") {
    const bestOf =
      input.classicBestOf === 5 ? 5 : 3;
    return {
      mode: "best_of",
      bestOf,
      setTarget: { value: 6 },
    };
  }
  if (input.matchScoreMode === "games" || input.raceToGames || input.raceToGamesGroup) {
    const base = input.raceToGames ?? input.raceToGamesGroup ?? 4;
    const config: MatchScoringConfig = {
      mode: "race_to",
      raceTo: { value: base },
    };
    if (input.raceToGamesGroup != null || input.raceToGamesKnockout != null) {
      config.group = {
        mode: "race_to",
        raceTo: { value: input.raceToGamesGroup ?? base },
      };
      config.knockout = {
        mode: "race_to",
        raceTo: { value: input.raceToGamesKnockout ?? base },
      };
    }
    return config;
  }
  return {
    mode: "race_to",
    raceTo: { value: input.pointsPerMatch && input.pointsPerMatch > 0 ? input.pointsPerMatch : 21 },
  };
}

export function parseCustomMatchSettings(raw: unknown): CustomMatchSettings | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  return {
    groupMeetingsPerPair:
      parsePositiveInt(
        v.groupMeetingsPerPair,
        GROUP_MEETINGS_PER_PAIR_MIN,
        GROUP_MEETINGS_PER_PAIR_MAX,
      ) ?? 1,
    knockoutLegsPerSlot:
      parsePositiveInt(
        v.knockoutLegsPerSlot,
        KNOCKOUT_LEGS_PER_SLOT_MIN,
        KNOCKOUT_LEGS_PER_SLOT_MAX,
      ) ?? 1,
  };
}

export function parseMexicanoSettings(raw: unknown): MexicanoSettings | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const mode =
    v.mode === "individual" || v.mode === "team" ? v.mode : undefined;
  if (!mode) return undefined;
  const roundCount =
    parsePositiveInt(v.roundCount, MEXICANO_ROUNDS_MIN, MEXICANO_ROUNDS_MAX) ?? 5;
  return { mode, roundCount };
}

export function parseRankingMode(raw: unknown): TournamentRankingMode | undefined {
  return raw === "tiered" || raw === "open" ? raw : undefined;
}

export function parseFormatFamily(raw: unknown): TournamentFormatFamily | undefined {
  return raw === "original" || raw === "custom" ? raw : undefined;
}

export function resolveMatchScoringForStage(
  config: MatchScoringConfig | undefined,
  stage: "group" | "knockout" | "default",
): MatchScoringConfig | undefined {
  if (!config) return undefined;
  if (stage === "group" && config.group) {
    return { ...config, ...config.group, group: undefined, knockout: undefined };
  }
  if (stage === "knockout" && config.knockout) {
    return { ...config, ...config.knockout, group: undefined, knockout: undefined };
  }
  return config;
}

export function getMatchScoringModeLabel(mode: MatchScoringMode): string {
  switch (mode) {
    case "best_of":
      return "Best of";
    case "race_to":
      return "Race to";
    case "total":
      return "Total";
    case "custom_score":
      return "Custom score";
    default:
      return mode;
  }
}

export function summarizeMatchScoring(config: MatchScoringConfig | undefined): string {
  if (!config) return "Legacy scoring";
  switch (config.mode) {
    case "best_of":
      return `Best of ${config.bestOf ?? 3} · set race to ${config.setTarget?.value ?? 4}`;
    case "race_to": {
      const base = config.raceTo?.value ?? 4;
      const group = config.group?.raceTo?.value;
      const knockout = config.knockout?.raceTo?.value;
      if (group != null || knockout != null) {
        return `Group race to ${group ?? base} · KO race to ${knockout ?? base}`;
      }
      return `Race to ${base}`;
    }
    case "total":
      return `Total ${config.totalSets ?? 3}`;
    case "custom_score":
      return config.customScore?.variant === "large_score"
        ? "Custom · large score"
        : "Custom · one-match winner";
    default:
      return getMatchScoringModeLabel(config.mode);
  }
}

/** Effective race-to N for a stage (Official matchScoring + stage overrides). */
export function raceToValueForStage(
  config: MatchScoringConfig | undefined,
  stage: "group" | "knockout" | "default",
): number | undefined {
  const resolved = resolveMatchScoringForStage(config, stage);
  if (resolved?.mode === "race_to" && resolved.raceTo?.value) {
    return resolved.raceTo.value;
  }
  return undefined;
}

/**
 * Stage leaves (group/knockout) only apply to Double Stage.
 * Strip them for other formats so a format switch cannot leak stale race targets
 * into single-elim / group-only / lobby scoring.
 */
export function matchScoringForFormat(
  config: MatchScoringConfig,
  format: string,
): MatchScoringConfig {
  if (format === "double_stage") return config;
  if (!config.group && !config.knockout) return config;
  const { group: _group, knockout: _knockout, ...leaf } = config;
  return leaf;
}

/** Seed partner-style group 4 / KO 6 when entering Double Stage race-to without overrides. */
export function ensureDoubleStageRaceOverrides(
  config: MatchScoringConfig,
): MatchScoringConfig {
  if (config.mode !== "race_to") return config;
  if (config.group?.raceTo?.value != null && config.knockout?.raceTo?.value != null) {
    return config;
  }
  const groupN = config.group?.raceTo?.value ?? config.raceTo?.value ?? 4;
  const knockoutN = config.knockout?.raceTo?.value ?? 6;
  return {
    ...config,
    raceTo: { value: groupN },
    group: { mode: "race_to", raceTo: { value: groupN } },
    knockout: { mode: "race_to", raceTo: { value: knockoutN } },
  };
}

export function defaultMatchScoring(): MatchScoringConfig {
  return { mode: "race_to", raceTo: { value: 4 } };
}

export function defaultCustomMatchSettings(): CustomMatchSettings {
  return { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 };
}

export function defaultMexicanoSettings(): MexicanoSettings {
  return { mode: "team", roundCount: 5 };
}
