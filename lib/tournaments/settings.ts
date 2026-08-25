import {
  RACE_TO_GAMES_OPTIONS,
  MATCH_SCORE_MODES,
  DEFAULT_GAME_RULES_BY_UNIT,
  normalizeGameDecider,
  type MatchScoreMode,
  type RaceToGames,
  type MatchGameRules,
} from "@/lib/tournaments/scoring/game-mode";
import {
  MATCH_FORMATS,
  classicDefaultsForSport,
  parseClassicSetRules,
  type ClassicSetRules,
  type MatchFormat,
} from "@/lib/tournaments/scoring/classic-sets";
import { isUuid } from "@/lib/domain/uuid";
import {
  normalizeAllowedTierLevels,
  resolveAllowedTierLevels,
} from "@/lib/tournaments/tier-restrictions";
import type { PlayerTierLevel } from "@/lib/player/tier";
import { matchPointsForTournamentTier } from "@/lib/player/tier";
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
import {
  deriveMatchScoringFromLegacy,
  matchScoreModeFromScoring,
  parseCustomMatchSettings,
  parseFormatFamily,
  parseMatchScoringConfig,
  parseMexicanoSettings,
  parseRankingMode,
  resolveMatchScoringForStage,
  summarizeMatchScoring,
  type CustomMatchSettings,
  type MatchScoringConfig,
  type MexicanoSettings,
  type TournamentFormatFamily,
  type TournamentRankingMode,
} from "@/lib/tournaments/match-config";

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

export type TournamentDisplayBrandTheme = {
  primaryColor?: string;
  accentColor?: string;
  /** Visual atmosphere for TV / scoreboard shells. */
  backgroundStyle?: "gradient" | "solid" | "dark_court";
  showPartnerLogo?: boolean;
  scoreboardStyle?: "classic" | "bold" | "minimal";
};

/** Sponsor logo/banner shown on venue fullscreen display only (max 6). */
export type TournamentDisplaySponsorBanner = {
  id: string;
  imageUrl: string;
  storageKey: string;
  label?: string;
};

export const MAX_DISPLAY_SPONSOR_BANNERS = 6;

export type TournamentDisplayConfig = {
  layout: TournamentDisplayLayout;
  courtIds?: string[];
  rotationIntervalSec?: number;
  /** When true, venue display cycles through rotationLayouts automatically. */
  autoRotate?: boolean;
  rotationLayouts?: TournamentDisplayLayout[];
  showUpcoming?: boolean;
  showHighlights?: boolean;
  /** Per-event hospitality branding (TV / website / scoreboard). */
  brandTheme?: TournamentDisplayBrandTheme;
  /** Multi-sponsor banners for venue TV strip (not public tournament page). */
  sponsorBanners?: TournamentDisplaySponsorBanner[];
};

export type TournamentSettings = TournamentRuleSections & {
  venueMapsUrl?: string;
  /** Skill tiers allowed to register (official free + fun match). */
  allowedTierLevels?: PlayerTierLevel[];
  /**
   * tiered = exact skill tier gate; open = No Rank (any player may register, no ranking pts).
   */
  rankingMode?: TournamentRankingMode;
  /** Original vs Custom match family (Official create flow). */
  formatFamily?: TournamentFormatFamily;
  /** Unified Official match scoring (Best of / Race to / Total / Custom). */
  matchScoring?: MatchScoringConfig;
  /** Custom family: repeated group fixtures + KO series legs. */
  customMatch?: CustomMatchSettings;
  /** Mexicano planner config (Original family only). */
  mexicano?: MexicanoSettings;
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
  /** Double-stage: race-to for group matches (falls back to raceToGames). */
  raceToGamesGroup?: RaceToGames;
  /** Double-stage: race-to for knockout matches (falls back to raceToGames). */
  raceToGamesKnockout?: RaceToGames;
  /**
   * Intra-game decider when both sides reach game point.
   * golden_point = No-Ad (first deuce decides);
   * star_point = FIP Star Point (third deuce decides);
   * advantage = win by 2.
   */
  gameDecider?: "golden_point" | "star_point" | "advantage";
  /**
   * race_to_games = shortened first-to-N (community).
   * classic_sets = ITF/FIP sets (6 games, TB-7, padel STB-10).
   */
  matchFormat?: MatchFormat;
  classicSetRules?: ClassicSetRules;
  courtCount?: number;
  deuceConfig?: TournamentDeuceConfig;
  roundDurationMinutes?: number;
  /** Extra minutes once when a timed match is tied at the hard stop. */
  suddenDeathExtensionMinutes?: number;
  /** live = rally tablet scoring; paper = organizer batch/final entry. */
  scoreEntryMode?: "live" | "paper";
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
export const TOURNAMENT_ROUND_DURATION_OPTIONS = [
  5, 10, 15, 20, 25, 30, 45, 60,
] as const;

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
    brandTheme: parseDisplayBrandTheme(v.brandTheme),
    sponsorBanners: parseSponsorBanners(v.sponsorBanners),
  };
}

function parseSponsorBanners(raw: unknown): TournamentDisplaySponsorBanner[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: TournamentDisplaySponsorBanner[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl.trim() : "";
    const storageKey = typeof o.storageKey === "string" ? o.storageKey.trim() : "";
    if (!id || !imageUrl || !storageKey) continue;
    const label =
      typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 80) : undefined;
    out.push({ id, imageUrl, storageKey, ...(label ? { label } : {}) });
    if (out.length >= MAX_DISPLAY_SPONSOR_BANNERS) break;
  }
  return out.length ? out : undefined;
}

function parseDisplayBrandTheme(raw: unknown): TournamentDisplayBrandTheme | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const colorOk = (c: unknown) =>
    typeof c === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c.trim());
  const bg =
    o.backgroundStyle === "gradient" ||
    o.backgroundStyle === "solid" ||
    o.backgroundStyle === "dark_court"
      ? o.backgroundStyle
      : undefined;
  const scoreboard =
    o.scoreboardStyle === "classic" ||
    o.scoreboardStyle === "bold" ||
    o.scoreboardStyle === "minimal"
      ? o.scoreboardStyle
      : undefined;
  const theme: TournamentDisplayBrandTheme = {
    ...(colorOk(o.primaryColor) ? { primaryColor: (o.primaryColor as string).trim() } : {}),
    ...(colorOk(o.accentColor) ? { accentColor: (o.accentColor as string).trim() } : {}),
    ...(bg ? { backgroundStyle: bg } : {}),
    ...(typeof o.showPartnerLogo === "boolean" ? { showPartnerLogo: o.showPartnerLogo } : {}),
    ...(scoreboard ? { scoreboardStyle: scoreboard } : {}),
  };
  return Object.keys(theme).length ? theme : undefined;
}

export function getTournamentFormatLabel(format: string | null | undefined): string {
  if (format === "americano") return "Americano";
  if (format === "double_stage") return "Group stage + knockout";
  if (format === "mexicano") return "Mexicano";
  if (format === "group_only") return "Group only";
  if (format === "single_elimination") return "Knockout / Elimination";
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
  const stored = getStoredMatchScoring(tournament);
  if (stored) return summarizeMatchScoring(stored);
  if (getTournamentMatchScoreMode(tournament) === "games") {
    return formatRaceToLabel(getTournamentRaceToTarget(tournament));
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
      ? formatRaceToLabel(getTournamentRaceToTarget(tournament))
      : getScoringTypeLabel(getTournamentScoringType(tournament));
  return `${mode} · ${courts}`;
}

/** Short hint for match scoring (bracket readiness, live toolbar). */
export function getTournamentMatchScoringHint(tournament: TournamentDetail): string {
  if (getTournamentScoringType(tournament) === "timed") {
    return `${getTournamentRoundDurationMinutes(tournament)} min per round`;
  }
  const stored = getStoredMatchScoring(tournament);
  if (stored) return summarizeMatchScoring(stored);
  if (getTournamentMatchScoreMode(tournament) === "games") {
    return `First to ${getTournamentRaceToTarget(tournament)} games`;
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
  const suddenDeathExtensionMinutes = raw.suddenDeathExtensionMinutes;
  const scoreEntryMode = raw.scoreEntryMode;
  const displayConfig = raw.displayConfig;
  const bracketSeedMode = raw.bracketSeedMode;
  const bracketSeedingFinalized = raw.bracketSeedingFinalized;
  const doubleStage = raw.doubleStage;
  const standingsScoring = raw.standingsScoring;
  const matchScoreMode = raw.matchScoreMode;
  const raceToGames = raw.raceToGames;
  const raceToGamesGroup = raw.raceToGamesGroup;
  const raceToGamesKnockout = raw.raceToGamesKnockout;
  const gameDecider = raw.gameDecider;
  const matchFormat = raw.matchFormat;
  const classicSetRulesRaw = raw.classicSetRules;
  const allowedTierLevels = raw.allowedTierLevels;
  const rankingMode = parseRankingMode(raw.rankingMode);
  const formatFamily = parseFormatFamily(raw.formatFamily);
  const matchScoringParsed = parseMatchScoringConfig(raw.matchScoring);
  const customMatch = parseCustomMatchSettings(raw.customMatch);
  const mexicano = parseMexicanoSettings(raw.mexicano);

  const parsedPoints =
    typeof pointsPerMatch === "number" && Number.isFinite(pointsPerMatch) && pointsPerMatch > 0
      ? Math.floor(pointsPerMatch)
      : undefined;

  const parsedRaceTo =
    typeof raceToGames === "number" &&
    RACE_TO_GAMES_OPTIONS.includes(raceToGames as RaceToGames)
      ? (raceToGames as RaceToGames)
      : undefined;

  const parseRaceOpt = (v: unknown): RaceToGames | undefined =>
    typeof v === "number" && RACE_TO_GAMES_OPTIONS.includes(v as RaceToGames)
      ? (v as RaceToGames)
      : undefined;

  const parsedGearIds = Array.isArray(gearEntityIds)
    ? gearEntityIds
        .map((id) => (typeof id === "string" ? id.trim() : String(id)))
        .filter((id) => isUuid(id))
    : undefined;

  const matchScoreModeParsed =
    typeof matchScoreMode === "string" &&
    MATCH_SCORE_MODES.includes(matchScoreMode as MatchScoreMode)
      ? (matchScoreMode as MatchScoreMode)
      : undefined;

  const matchFormatParsed =
    typeof matchFormat === "string" && MATCH_FORMATS.includes(matchFormat as MatchFormat)
      ? (matchFormat as MatchFormat)
      : undefined;

  const classicSetRules = parseClassicSetRules(classicSetRulesRaw) ?? undefined;

  const matchScoring =
    matchScoringParsed ??
    deriveMatchScoringFromLegacy({
      matchScoreMode: matchScoreModeParsed,
      raceToGames: parsedRaceTo,
      raceToGamesGroup: parseRaceOpt(raceToGamesGroup),
      raceToGamesKnockout: parseRaceOpt(raceToGamesKnockout),
      pointsPerMatch: parsedPoints,
      matchFormat: matchFormatParsed,
      classicBestOf: classicSetRules?.bestOfSets,
    });

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
    rankingMode,
    formatFamily,
    matchScoring,
    customMatch,
    mexicano,
    maxRounds:
      typeof maxRounds === "number" && Number.isFinite(maxRounds) && maxRounds > 0
        ? Math.floor(maxRounds)
        : undefined,
    scoringType:
      scoringType === "points" || scoringType === "timed" ? scoringType : undefined,
    pointsPerMatch: parsedPoints,
    matchScoreMode: matchScoreModeParsed,
    raceToGames: parsedRaceTo,
    raceToGamesGroup: parseRaceOpt(raceToGamesGroup),
    raceToGamesKnockout: parseRaceOpt(raceToGamesKnockout),
    gameDecider: normalizeGameDecider(
      typeof gameDecider === "string" ? gameDecider : undefined,
    ),
    matchFormat: matchFormatParsed,
    classicSetRules,
    scoreEntryMode:
      scoreEntryMode === "live" || scoreEntryMode === "paper"
        ? scoreEntryMode
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
    suddenDeathExtensionMinutes:
      typeof suddenDeathExtensionMinutes === "number" &&
      Number.isFinite(suddenDeathExtensionMinutes) &&
      suddenDeathExtensionMinutes > 0
        ? Math.floor(suddenDeathExtensionMinutes)
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
  const settings = parseTournamentSettings(tournament.settings);
  if (settings.rankingMode === "open") return null;
  const configured = settings.allowedTierLevels;
  return resolveAllowedTierLevels(
    tournament.tournamentType,
    tournament.officialBilling,
    configured,
    settings.rankingMode,
  );
}

/** No Rank / open ranking — any player may register; no career ranking points. */
export function isTournamentRankingOpen(tournament: TournamentDetail): boolean {
  return parseTournamentSettings(tournament.settings).rankingMode === "open";
}

export function getTournamentFormatFamily(
  tournament: TournamentDetail,
): TournamentFormatFamily {
  return parseTournamentSettings(tournament.settings).formatFamily ?? "original";
}

export function getTournamentMatchScoring(
  tournament: TournamentDetail,
): MatchScoringConfig | undefined {
  return parseTournamentSettings(tournament.settings).matchScoring;
}

export function getTournamentCustomMatchSettings(
  tournament: TournamentDetail,
): CustomMatchSettings {
  return (
    parseTournamentSettings(tournament.settings).customMatch ?? {
      groupMeetingsPerPair: 1,
      knockoutLegsPerSlot: 1,
    }
  );
}

export function getTournamentMexicanoSettings(
  tournament: TournamentDetail,
): MexicanoSettings | undefined {
  return parseTournamentSettings(tournament.settings).mexicano;
}

/** Single Official skill tier used for ranking ±points and eligibility. */
export function getTournamentSkillTier(
  tournament: TournamentDetail,
): PlayerTierLevel | null {
  const allowed = getTournamentAllowedTierLevels(tournament);
  return allowed?.[0] ?? null;
}

export function isOfficialTournamentStaff(
  tournament: TournamentDetail,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  return getOfficialTournamentStaff(tournament).some((member) => member.userId === userId);
}

export function getMaxRounds(tournament: TournamentDetail): number | null {
  const settings = parseTournamentSettings(tournament.settings);
  if (tournament.format === "mexicano" && settings.mexicano?.roundCount) {
    return settings.mexicano.roundCount;
  }
  return settings.maxRounds ?? null;
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

export type TournamentRaceStage = "group" | "knockout" | "default";

/**
 * Match scoring shape.
 * Prefer explicit settings (matchScoreMode / raceToGames) so legacy flat-point
 * padel tournaments are not forced into games mode mid-event.
 * Stored Official `matchScoring` overrides only when present in settings JSON
 * (derived dual-read configs must not flip Fun Match points → games).
 *
 * For Double Stage with independent group/knockout leaves, pass `stage` so
 * manage/live scoring follows that stage's mode (e.g. group race_to, KO custom).
 */
export function getTournamentMatchScoreMode(
  tournament: TournamentDetail,
  stage: TournamentRaceStage = "default",
): MatchScoreMode {
  const stored = getStoredMatchScoring(tournament);
  const hasStageLeaves = Boolean(stored?.group || stored?.knockout);
  if (stage !== "default" && hasStageLeaves) {
    const resolved = resolveMatchScoringForStage(stored, stage);
    const fromScoring = matchScoreModeFromScoring(resolved);
    if (fromScoring) return fromScoring;
  }

  const settings = parseTournamentSettings(tournament.settings);
  if (settings.matchScoreMode) return settings.matchScoreMode;
  if (settings.raceToGames) return "games";

  const fromRoot = matchScoreModeFromScoring(stored);
  if (fromRoot) return fromRoot;
  return "points";
}

/** Explicit `settings.matchScoring` only (ignores derive-from-legacy dual-read). */
function getStoredMatchScoring(
  tournament: TournamentDetail,
): MatchScoringConfig | undefined {
  const raw = tournament.settings;
  if (!raw || typeof raw !== "object") return undefined;
  return parseMatchScoringConfig((raw as Record<string, unknown>).matchScoring);
}

/**
 * Effective games target for a match/leg (race-to N or total N).
 * Prefers Official `matchScoring` over legacy raceToGames.
 */
export function getTournamentRaceToTarget(
  tournament: TournamentDetail,
  stage: TournamentRaceStage = "default",
): number {
  const resolved = resolveMatchScoringForStage(
    getStoredMatchScoring(tournament),
    stage === "default" ? "default" : stage,
  );
  if (resolved?.mode === "race_to" && resolved.raceTo?.value) {
    return resolved.raceTo.value;
  }
  if (resolved?.mode === "total" && resolved.totalSets != null && resolved.totalSets > 0) {
    return resolved.totalSets;
  }
  // Fall back to legacy per-stage raceToGamesGroup / raceToGamesKnockout.
  return getTournamentRaceToGamesForStage(tournament, stage);
}

export function getTournamentRaceToGames(tournament: TournamentDetail): RaceToGames {
  const settings = parseTournamentSettings(tournament.settings);
  const stored = getStoredMatchScoring(tournament);
  if (stored?.mode === "race_to" && stored.raceTo?.value) {
    const v = stored.raceTo.value;
    if (RACE_TO_GAMES_OPTIONS.includes(v as RaceToGames)) return v as RaceToGames;
  }
  if (settings.raceToGames) return settings.raceToGames;
  const unit = settings.standingsScoring?.scoreUnit
    ?? getDefaultStandingsScoringForSport(tournament.sportSlug).scoreUnit;
  if (unit === "sets") return 2;
  return 4;
}

/** Resolve race-to-N for a match stage (double-stage group vs knockout). */
export function getTournamentRaceToGamesForStage(
  tournament: TournamentDetail,
  stage: TournamentRaceStage = "default",
): RaceToGames {
  const settings = parseTournamentSettings(tournament.settings);
  const resolved = resolveMatchScoringForStage(
    getStoredMatchScoring(tournament),
    stage === "default" ? "default" : stage,
  );
  if (resolved?.mode === "race_to" && resolved.raceTo?.value) {
    const v = resolved.raceTo.value;
    if (RACE_TO_GAMES_OPTIONS.includes(v as RaceToGames)) return v as RaceToGames;
  }
  if (stage === "group" && settings.raceToGamesGroup) return settings.raceToGamesGroup;
  if (stage === "knockout" && settings.raceToGamesKnockout) {
    return settings.raceToGamesKnockout;
  }
  return getTournamentRaceToGames(tournament);
}

export function getTournamentGameRules(
  tournament: TournamentDetail,
  stage: TournamentRaceStage = "default",
): MatchGameRules {
  const settings = parseTournamentSettings(tournament.settings);
  const unit = settings.standingsScoring?.scoreUnit
    ?? getDefaultStandingsScoringForSport(tournament.sportSlug).scoreUnit;
  const base =
    unit === "sets" ? DEFAULT_GAME_RULES_BY_UNIT.sets : DEFAULT_GAME_RULES_BY_UNIT.games;
  const resolved = resolveMatchScoringForStage(
    getStoredMatchScoring(tournament),
    stage === "default" ? "default" : stage,
  );
  const lengthMode = resolved?.mode === "total" ? "total" : "race_to";
  return {
    ...base,
    raceToGames: getTournamentRaceToTarget(tournament, stage),
    lengthMode,
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

export function getTournamentSuddenDeathExtensionMinutes(
  tournament: TournamentDetail,
): number {
  const settings = parseTournamentSettings(tournament.settings);
  return (
    settings.suddenDeathExtensionMinutes ?? DEFAULT_SUDDEN_DEATH_EXTENSION_MINUTES
  );
}

export function getTournamentScoreEntryMode(
  tournament: TournamentDetail,
): "live" | "paper" {
  return parseTournamentSettings(tournament.settings).scoreEntryMode ?? "live";
}

export function getTournamentMatchFormat(
  tournament: TournamentDetail,
): MatchFormat {
  return parseTournamentSettings(tournament.settings).matchFormat ?? "race_to_games";
}

export function getTournamentClassicSetRules(
  tournament: TournamentDetail,
  stage: TournamentRaceStage = "default",
): ClassicSetRules {
  const settings = parseTournamentSettings(tournament.settings);
  const base = settings.classicSetRules ?? classicDefaultsForSport(tournament.sportSlug);
  const resolved = resolveMatchScoringForStage(
    getStoredMatchScoring(tournament),
    stage === "default" ? "default" : stage,
  );
  if (resolved?.mode === "best_of") {
    const gamesToWinSet = resolved.setTarget?.value ?? base.gamesToWinSet;
    return {
      ...base,
      bestOfSets: resolved.bestOf === 5 ? 5 : 3,
      gamesToWinSet,
      setTiebreakAt: Math.max(gamesToWinSet, 1),
      walkoverGamesPerSet: gamesToWinSet,
    };
  }
  return base;
}

/**
 * Classic sets engine when partner `matchFormat` is classic_sets, or when the
 * resolved Official stage scoring mode is `best_of`.
 */
export function isClassicSetsFormat(
  tournament: TournamentDetail,
  stage: TournamentRaceStage = "default",
): boolean {
  if (getTournamentMatchFormat(tournament) === "classic_sets") return true;
  const resolved = resolveMatchScoringForStage(
    getStoredMatchScoring(tournament),
    stage === "default" ? "default" : stage,
  );
  return resolved?.mode === "best_of";
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
  rankingMode?: TournamentRankingMode;
  formatFamily?: TournamentFormatFamily;
  matchScoring?: MatchScoringConfig;
  customMatch?: CustomMatchSettings;
  mexicano?: MexicanoSettings;
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  matchScoreMode?: MatchScoreMode;
  raceToGames?: RaceToGames;
  raceToGamesGroup?: RaceToGames;
  raceToGamesKnockout?: RaceToGames;
  gameDecider?: "golden_point" | "star_point" | "advantage";
  matchFormat?: MatchFormat;
  classicSetRules?: ClassicSetRules;
  courtCount?: number;
  deuceConfig?: TournamentDeuceConfig;
  roundDurationMinutes?: number;
  suddenDeathExtensionMinutes?: number;
  scoreEntryMode?: "live" | "paper";
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
  rankingMode?: TournamentRankingMode;
  formatFamily?: TournamentFormatFamily;
  matchScoring?: MatchScoringConfig;
  customMatch?: CustomMatchSettings;
  mexicano?: MexicanoSettings;
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  matchScoreMode?: MatchScoreMode;
  raceToGames?: RaceToGames;
  raceToGamesGroup?: RaceToGames;
  raceToGamesKnockout?: RaceToGames;
  gameDecider?: "golden_point" | "star_point" | "advantage";
  matchFormat?: MatchFormat;
  classicSetRules?: ClassicSetRules;
  courtCount?: number;
  deuceConfig?: TournamentDeuceConfig;
  roundDurationMinutes?: number;
  suddenDeathExtensionMinutes?: number;
  scoreEntryMode?: "live" | "paper";
  bestRunnerUpSlots?: number;
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
  | "doubleStage"
  | "standingsScoring"
  | "matchScoreMode"
  | "raceToGames"
  | "gameDecider"
  | "matchFormat"
  | "classicSetRules"
> {
  if (input.format !== "double_stage" && input.format !== "group_only") return {};

  const sportDefaults = getDefaultStandingsScoringForSport(sportSlug);
  const usesGames = sportDefaults.scoreUnit === "games" || sportDefaults.scoreUnit === "sets";
  const defaultRace: RaceToGames =
    input.raceToGames != null &&
    RACE_TO_GAMES_OPTIONS.includes(input.raceToGames as RaceToGames)
      ? (input.raceToGames as RaceToGames)
      : sportDefaults.scoreUnit === "sets"
        ? 2
        : 4;

  // Official skill tier drives standings PTS per win (Gold=5, Platinum=8, …).
  // No Rank (open) uses sport defaults.
  const tierForPoints =
    input.rankingMode === "open" ? undefined : input.allowedTierLevels?.[0];
  const tierWinPoints =
    tierForPoints != null ? matchPointsForTournamentTier(tierForPoints) : undefined;

  const doubleStage =
    input.format === "group_only"
      ? {
          ...DEFAULT_DOUBLE_STAGE_SETTINGS,
          phase: "group" as const,
          maxTeamsPerGroup: input.maxTeamsPerGroup ?? DEFAULT_DOUBLE_STAGE_SETTINGS.maxTeamsPerGroup,
          teamsAdvancePerGroup: 0,
          bestRunnerUpSlots: 0,
          thirdPlaceEnabled: false,
        }
      : {
          ...DEFAULT_DOUBLE_STAGE_SETTINGS,
          maxTeamsPerGroup: input.maxTeamsPerGroup ?? DEFAULT_DOUBLE_STAGE_SETTINGS.maxTeamsPerGroup,
          teamsAdvancePerGroup:
            input.teamsAdvancePerGroup ?? DEFAULT_DOUBLE_STAGE_SETTINGS.teamsAdvancePerGroup,
          bestRunnerUpSlots: input.bestRunnerUpSlots ?? 0,
          thirdPlaceEnabled: input.thirdPlaceEnabled ?? false,
        };

  return {
    doubleStage,
    standingsScoring: {
      ...sportDefaults,
      allowDraw: input.allowDraw ?? sportDefaults.allowDraw,
      winPoints: input.winPoints ?? tierWinPoints ?? sportDefaults.winPoints,
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
    matchFormat: input.matchFormat,
    classicSetRules:
      input.classicSetRules ??
      (input.matchFormat === "classic_sets" ? classicDefaultsForSport(sportSlug) : undefined),
  };
}

export function settingsInputFromUpsert(
  input: TournamentSettingsUpsertFields,
  sportSlug?: string,
): TournamentSettingsInput {
  const formatSpecific =
    sportSlug != null ? buildFormatSpecificSettingsFromUpsert(input, sportSlug) : {};
  const next: TournamentSettingsInput = {
    venueMapsUrl: input.venueMapsUrl,
    eligibilityHtml: input.eligibilityRules,
    matchFormatHtml: input.matchFormatRules || input.rules,
    equipmentStandardsHtml: input.equipmentStandardsRules,
    gearEntityIds: input.gearEntityIds,
    rankingMode: input.rankingMode,
    formatFamily: input.formatFamily,
    matchScoring: input.matchScoring,
    maxRounds: input.maxRounds,
    scoringType: input.scoringType,
    pointsPerMatch: input.pointsPerMatch,
    matchScoreMode: input.matchScoreMode ?? formatSpecific.matchScoreMode,
    raceToGames: input.raceToGames ?? formatSpecific.raceToGames,
    raceToGamesGroup: input.raceToGamesGroup,
    raceToGamesKnockout: input.raceToGamesKnockout,
    gameDecider: input.gameDecider ?? formatSpecific.gameDecider,
    matchFormat: input.matchFormat ?? formatSpecific.matchFormat,
    classicSetRules: input.classicSetRules ?? formatSpecific.classicSetRules,
    courtCount: input.courtCount,
    deuceConfig: input.deuceConfig,
    roundDurationMinutes: input.roundDurationMinutes,
    suddenDeathExtensionMinutes: input.suddenDeathExtensionMinutes,
    doubleStage: input.doubleStage ?? formatSpecific.doubleStage,
    standingsScoring: input.standingsScoring ?? formatSpecific.standingsScoring,
    allowedTierLevels:
      input.rankingMode === "open" ? [] : input.allowedTierLevels,
  };

  // Custom meetings/legs only persist under Custom family; Original clears leftovers.
  if (input.formatFamily === "custom") {
    next.customMatch = input.customMatch;
  } else if (input.formatFamily === "original") {
    next.customMatch = undefined;
  } else if (input.customMatch) {
    next.customMatch = input.customMatch;
  }

  // Mexicano settings only when format is mexicano; known other formats clear it.
  if (input.format === "mexicano") {
    next.mexicano = input.mexicano;
  } else if (input.format) {
    next.mexicano = undefined;
  } else if (input.mexicano) {
    next.mexicano = input.mexicano;
  }

  if (input.scoreEntryMode === "live" || input.scoreEntryMode === "paper") {
    next.scoreEntryMode = input.scoreEntryMode;
  }
  if (input.displayConfig) {
    next.displayConfig = input.displayConfig;
  }
  return next;
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

  if (
    input.raceToGamesGroup != null &&
    RACE_TO_GAMES_OPTIONS.includes(input.raceToGamesGroup as RaceToGames)
  ) {
    next.raceToGamesGroup = input.raceToGamesGroup;
  } else if ("raceToGamesGroup" in input) {
    delete next.raceToGamesGroup;
  }

  if (
    input.raceToGamesKnockout != null &&
    RACE_TO_GAMES_OPTIONS.includes(input.raceToGamesKnockout as RaceToGames)
  ) {
    next.raceToGamesKnockout = input.raceToGamesKnockout;
  } else if ("raceToGamesKnockout" in input) {
    delete next.raceToGamesKnockout;
  }

  {
    const normalized = normalizeGameDecider(
      typeof input.gameDecider === "string" ? input.gameDecider : undefined,
    );
    if (normalized) {
      next.gameDecider = normalized;
    } else if ("gameDecider" in input) {
      delete next.gameDecider;
    }
  }

  if (
    input.matchFormat === "classic_sets" ||
    input.matchFormat === "race_to_games"
  ) {
    next.matchFormat = input.matchFormat;
  } else if ("matchFormat" in input) {
    delete next.matchFormat;
  }

  if (input.classicSetRules) {
    next.classicSetRules = input.classicSetRules;
  } else if ("classicSetRules" in input) {
    delete next.classicSetRules;
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

  if (
    input.suddenDeathExtensionMinutes != null &&
    input.suddenDeathExtensionMinutes > 0
  ) {
    next.suddenDeathExtensionMinutes = Math.floor(input.suddenDeathExtensionMinutes);
  } else if ("suddenDeathExtensionMinutes" in input) {
    delete next.suddenDeathExtensionMinutes;
  }

  // Only overwrite when explicitly set — upsert payloads often include
  // `scoreEntryMode: undefined` / `displayConfig: undefined`, which must NOT
  // wipe Manage → Display settings (brand theme, layout, tablet mode).
  if (input.scoreEntryMode === "live" || input.scoreEntryMode === "paper") {
    next.scoreEntryMode = input.scoreEntryMode;
  }

  if (input.displayConfig) {
    next.displayConfig = input.displayConfig;
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

  if (input.rankingMode === "tiered" || input.rankingMode === "open") {
    next.rankingMode = input.rankingMode;
    if (input.rankingMode === "open") {
      delete next.allowedTierLevels;
    }
  } else if ("rankingMode" in input) {
    delete next.rankingMode;
  }

  if (input.formatFamily === "original" || input.formatFamily === "custom") {
    next.formatFamily = input.formatFamily;
  } else if ("formatFamily" in input) {
    delete next.formatFamily;
  }

  if (input.matchScoring) {
    next.matchScoring = input.matchScoring;
  } else if ("matchScoring" in input) {
    delete next.matchScoring;
  }

  // Original family never carries Custom meetings/legs — clear leftover JSON on save.
  if (input.formatFamily === "original") {
    delete next.customMatch;
  } else if (input.customMatch) {
    next.customMatch = input.customMatch;
  } else if ("customMatch" in input) {
    delete next.customMatch;
  }

  // Mexicano config only when provided; explicit undefined clears (format switch).
  if (input.mexicano) {
    next.mexicano = input.mexicano;
  } else if ("mexicano" in input) {
    delete next.mexicano;
  }

  return next;
}
