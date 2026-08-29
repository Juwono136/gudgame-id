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
  "swiss",
] as const;

/** Formats available under Custom family. */
export const CUSTOM_FORMATS = [
  "double_stage",
  "americano",
  "single_elimination",
  "group_only",
  "mexicano",
  "modified_swiss",
] as const;

export const OFFICIAL_CREATABLE_FORMATS = [
  "americano",
  "single_elimination",
  "double_stage",
  "mexicano",
  "group_only",
  "swiss",
  "modified_swiss",
] as const;

/** Map UI format keys to scoring/bracket engines (Swiss variants reuse closest engine). */
export function resolveFormatEngine(format: string): string {
  if (format === "swiss") return "group_only";
  /** Custom Modified Swiss = round-robin pools (meet once), not Mexicano rotation. */
  if (format === "modified_swiss") return "group_only";
  return format;
}
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

/**
 * Race-to overrides keyed by distance-from-final (stable across field sizes).
 * Final / SF / QF mean the same whether the bracket starts at R32 or R16.
 */
export const KNOCKOUT_ROUND_KEYS = [
  "final",
  "sf",
  "qf",
  "r16",
  "r32",
  "r64",
] as const;
export type KnockoutRoundKey = (typeof KNOCKOUT_ROUND_KEYS)[number];

export type RaceToByRound = Partial<Record<KnockoutRoundKey, number>>;

export const KNOCKOUT_ROUND_KEY_LABELS: Record<KnockoutRoundKey, string> = {
  final: "Final",
  sf: "Semifinal",
  qf: "Quarterfinal",
  r16: "Round of 16",
  r32: "Round of 32",
  r64: "Round of 64",
};

export type MatchScoringConfig = {
  mode: MatchScoringMode;
  /** Best of 3 or 5 — first to win ceil(n/2) sets. */
  bestOf?: BestOfOption;
  /** Per-set race target when mode = best_of. */
  setTarget?: RaceToTarget;
  /** Flat race-to-N when mode = race_to (default for rounds without raceToByRound). */
  raceTo?: RaceToTarget;
  /**
   * Optional per-knockout-round race-to (Custom elimination / KO stage).
   * Keys are distance-from-final; omit rounds that use {@link raceTo}.
   */
  raceToByRound?: RaceToByRound;
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
  const engine = resolveFormatEngine(format);
  return engine === "double_stage" || engine === "group_only";
}

export function formatHasKnockout(format: string): boolean {
  const engine = resolveFormatEngine(format);
  return engine === "double_stage" || engine === "single_elimination";
}

export function formatHasLobbyRounds(format: string): boolean {
  const engine = resolveFormatEngine(format);
  return engine === "americano" || engine === "mexicano";
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

function parseRaceToByRound(raw: unknown): RaceToByRound | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const src = raw as Record<string, unknown>;
  const out: RaceToByRound = {};
  for (const key of KNOCKOUT_ROUND_KEYS) {
    const n = parsePositiveInt(src[key], RACE_TO_CUSTOM_MIN, RACE_TO_CUSTOM_MAX);
    if (n != null) out[key] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
    const byRound = parseRaceToByRound(raw.raceToByRound);
    if (byRound) base.raceToByRound = byRound;
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

/** Leaf scoring config without nested stage overrides. */
export type MatchScoringLeaf = Omit<MatchScoringConfig, "group" | "knockout">;

export function matchScoringLeafFromMode(mode: MatchScoringMode): MatchScoringLeaf {
  switch (mode) {
    case "best_of":
      return { mode: "best_of", bestOf: 3, setTarget: { value: 4 } };
    case "race_to":
      return { mode: "race_to", raceTo: { value: 4 } };
    case "total":
      return { mode: "total", totalSets: 3 };
    case "custom_score":
      return {
        mode: "custom_score",
        customScore: {
          variant: "one_match_winner",
          allowDraw: false,
          tiePolicy: "continue",
        },
      };
    default:
      return { mode: "race_to", raceTo: { value: 4 } };
  }
}

/** Drop fields that do not belong to the active mode (avoids stale merge leftovers). */
export function normalizeMatchScoringLeaf(leaf: MatchScoringLeaf): MatchScoringLeaf {
  const fallback = matchScoringLeafFromMode(leaf.mode);
  switch (leaf.mode) {
    case "best_of":
      return {
        mode: "best_of",
        bestOf: leaf.bestOf === 5 ? 5 : 3,
        setTarget: leaf.setTarget ?? fallback.setTarget,
      };
    case "race_to": {
      const raceToByRound = parseRaceToByRound(leaf.raceToByRound);
      return {
        mode: "race_to",
        raceTo: leaf.raceTo ?? fallback.raceTo,
        ...(raceToByRound ? { raceToByRound } : {}),
      };
    }
    case "total":
      return {
        mode: "total",
        totalSets: leaf.totalSets ?? fallback.totalSets,
      };
    case "custom_score":
      return {
        mode: "custom_score",
        customScore: leaf.customScore ?? fallback.customScore,
      };
    default:
      return fallback;
  }
}

export function asMatchScoringLeaf(
  config: MatchScoringConfig | MatchScoringLeaf,
): MatchScoringLeaf {
  const { group: _group, knockout: _knockout, ...leaf } = config as MatchScoringConfig;
  return normalizeMatchScoringLeaf(leaf);
}

export function composeDoubleStageMatchScoring(
  group: MatchScoringLeaf,
  knockout: MatchScoringLeaf,
): MatchScoringConfig {
  const groupLeaf = normalizeMatchScoringLeaf(group);
  const knockoutLeaf = normalizeMatchScoringLeaf(knockout);
  return {
    ...groupLeaf,
    group: groupLeaf,
    knockout: knockoutLeaf,
  };
}

export function resolveMatchScoringForStage(
  config: MatchScoringConfig | undefined,
  stage: "group" | "knockout" | "default",
): MatchScoringConfig | undefined {
  if (!config) return undefined;
  if (stage === "group" && config.group) {
    const merged: MatchScoringLeaf = {
      ...asMatchScoringLeaf(config),
      ...config.group,
      mode: config.group.mode ?? config.mode,
    };
    return normalizeMatchScoringLeaf(merged);
  }
  if (stage === "knockout" && config.knockout) {
    const merged: MatchScoringLeaf = {
      ...asMatchScoringLeaf(config),
      ...config.knockout,
      mode: config.knockout.mode ?? config.mode,
    };
    return normalizeMatchScoringLeaf(merged);
  }
  return asMatchScoringLeaf(config);
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

export function summarizeMatchScoringLeaf(
  leaf: MatchScoringLeaf | MatchScoringConfig | undefined,
): string {
  if (!leaf) return "Legacy scoring";
  switch (leaf.mode) {
    case "best_of":
      return `Best of ${leaf.bestOf ?? 3} · set race to ${leaf.setTarget?.value ?? 4}`;
    case "race_to": {
      const byRound = leaf.raceToByRound
        ? KNOCKOUT_ROUND_KEYS.filter((k) => leaf.raceToByRound?.[k] != null)
            .map((k) => `${KNOCKOUT_ROUND_KEY_LABELS[k]} ${leaf.raceToByRound![k]}`)
            .join(" · ")
        : null;
      if (byRound) return `Race to (by round) · ${byRound}`;
      return `Race to ${leaf.raceTo?.value ?? 4}`;
    }
    case "total":
      return `Total ${leaf.totalSets ?? 3}`;
    case "custom_score":
      return leaf.customScore?.variant === "large_score"
        ? "Custom · large score"
        : "Custom · one-match winner";
    default:
      return getMatchScoringModeLabel(leaf.mode);
  }
}

export function summarizeMatchScoring(config: MatchScoringConfig | undefined): string {
  if (!config) return "Legacy scoring";
  if (config.group || config.knockout) {
    const group = resolveMatchScoringForStage(config, "group");
    const knockout = resolveMatchScoringForStage(config, "knockout");
    if (group && knockout) {
      return `Group: ${summarizeMatchScoringLeaf(group)} · KO: ${summarizeMatchScoringLeaf(knockout)}`;
    }
  }
  return summarizeMatchScoringLeaf(config);
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

export function knockoutRoundKeyFromFromFinal(
  fromFinal: number,
): KnockoutRoundKey | "earlier" {
  if (fromFinal === 1) return "final";
  if (fromFinal === 2) return "sf";
  if (fromFinal === 3) return "qf";
  if (fromFinal === 4) return "r16";
  if (fromFinal === 5) return "r32";
  if (fromFinal === 6) return "r64";
  return "earlier";
}

export function knockoutRoundKeyFromBracket(
  roundNumber: number,
  totalRounds: number,
): KnockoutRoundKey | "earlier" {
  const fromFinal = totalRounds - roundNumber + 1;
  return knockoutRoundKeyFromFromFinal(fromFinal);
}

/** Round keys to show in the wizard for a given field size (earliest first). */
export function knockoutRoundKeysForTeamCount(teamCount: number): KnockoutRoundKey[] {
  const rounds = Math.min(
    6,
    Math.max(1, Math.ceil(Math.log2(Math.max(2, teamCount)))),
  );
  const keys: KnockoutRoundKey[] = [];
  for (let fromFinal = rounds; fromFinal >= 1; fromFinal -= 1) {
    const key = knockoutRoundKeyFromFromFinal(fromFinal);
    if (key !== "earlier") keys.push(key);
  }
  return keys;
}

/**
 * Resolve race-to for a knockout round.
 * Falls back: exact key → r64 (for earlier) → leaf.raceTo → undefined.
 */
export function resolveRaceToForKnockoutRound(
  leaf: MatchScoringLeaf | MatchScoringConfig | undefined,
  key: KnockoutRoundKey | "earlier",
): number | undefined {
  if (!leaf || leaf.mode !== "race_to") return undefined;
  const map = leaf.raceToByRound;
  if (map) {
    if (key !== "earlier" && typeof map[key] === "number") return map[key];
    if (key === "earlier" && typeof map.r64 === "number") return map.r64;
  }
  return leaf.raceTo?.value;
}

/** True when raceToByRound differs from the default raceTo for any configured key. */
export function hasDistinctRaceToByRound(leaf: MatchScoringLeaf | undefined): boolean {
  if (!leaf?.raceToByRound) return false;
  const def = leaf.raceTo?.value;
  return KNOCKOUT_ROUND_KEYS.some((k) => {
    const v = leaf.raceToByRound?.[k];
    return typeof v === "number" && (def == null || v !== def);
  });
}

/**
 * Stage leaves (group/knockout) only apply to Double Stage.
 * Strip them for other formats so a format switch cannot leak stale scoring
 * into single-elim / group-only / lobby.
 * When leaving Double Stage, promote knockout race-to / raceToByRound onto the root leaf.
 */
export function matchScoringForFormat(
  config: MatchScoringConfig,
  format: string,
): MatchScoringConfig {
  if (format === "double_stage") return config;
  if (!config.group && !config.knockout) return config;

  const root = asMatchScoringLeaf(config);
  const knockout = config.knockout
    ? normalizeMatchScoringLeaf({
        ...root,
        ...config.knockout,
        mode: config.knockout.mode ?? root.mode,
      })
    : null;

  // Prefer knockout race settings when switching to pure elimination.
  if (format === "single_elimination" && knockout?.mode === "race_to") {
    return normalizeMatchScoringLeaf({
      mode: "race_to",
      raceTo: knockout.raceTo ?? root.raceTo ?? { value: 6 },
      ...(knockout.raceToByRound
        ? { raceToByRound: knockout.raceToByRound }
        : root.raceToByRound
          ? { raceToByRound: root.raceToByRound }
          : {}),
    });
  }

  return root;
}

/**
 * Ensure Double Stage always stores independent group + knockout leaves.
 * Defaults: group race-to 4, knockout race-to 6 (partner Short race-to-N pattern)
 * when the incoming config has no stage leaves yet.
 * Root `raceToByRound` (from Elimination) moves onto the knockout leaf — not group.
 */
export function ensureDoubleStageScoringLeaves(
  config: MatchScoringConfig,
): MatchScoringConfig {
  const rootLeaf = asMatchScoringLeaf(config);
  const rootByRound = rootLeaf.raceToByRound;

  const groupSource = config.group
    ? {
        ...rootLeaf,
        ...config.group,
        mode: config.group.mode ?? config.mode,
        raceToByRound: undefined,
      }
    : { ...rootLeaf, raceToByRound: undefined };

  const groupLeaf = normalizeMatchScoringLeaf(groupSource);

  let knockoutLeaf: MatchScoringLeaf;
  if (config.knockout?.mode) {
    knockoutLeaf = normalizeMatchScoringLeaf({
      ...matchScoringLeafFromMode(config.knockout.mode),
      ...config.knockout,
      mode: config.knockout.mode,
      raceToByRound: config.knockout.raceToByRound ?? rootByRound,
    });
  } else if (rootLeaf.mode === "race_to") {
    // New Double Stage: keep group race-to on root/group; default KO to 6
    // (partner Short race-to-N) unless an explicit KO leaf already exists.
    knockoutLeaf = normalizeMatchScoringLeaf({
      mode: "race_to",
      raceTo: { value: 6 },
      ...(rootByRound ? { raceToByRound: rootByRound } : {}),
    });
  } else {
    knockoutLeaf = { ...groupLeaf };
  }

  return composeDoubleStageMatchScoring(groupLeaf, knockoutLeaf);
}

/** @deprecated Use ensureDoubleStageScoringLeaves — kept for call-site stability. */
export function ensureDoubleStageRaceOverrides(
  config: MatchScoringConfig,
): MatchScoringConfig {
  return ensureDoubleStageScoringLeaves(config);
}

/** Map Official matchScoring mode → live points/games entry shape. */
export function matchScoreModeFromScoring(
  config: MatchScoringConfig | MatchScoringLeaf | undefined,
): "points" | "games" | undefined {
  if (!config) return undefined;
  if (config.mode === "custom_score") return "points";
  if (
    config.mode === "race_to" ||
    config.mode === "best_of" ||
    config.mode === "total"
  ) {
    return "games";
  }
  return undefined;
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
