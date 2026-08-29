"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { WikiStepper } from "@/components/admin/wiki/wiki-stepper";
import { TournamentWizardFooter } from "@/components/admin/tournaments/tournament-wizard-footer";
import { TournamentWizardReview } from "@/components/admin/tournaments/tournament-wizard-review";
import { TournamentWizardStepHeader } from "@/components/admin/tournaments/tournament-wizard-step-header";
import { BillingTypeSelect } from "@/components/tournaments/form/billing-type-select";
import {
  CategorySelect,
  TOURNAMENT_CATEGORY_OPTIONS,
  type TournamentCategoryOption,
} from "@/components/tournaments/form/category-select";
import { AllowedTierLevelsSelect } from "@/components/tournaments/form/allowed-tier-levels-select";
import { FormatTypeSelect } from "@/components/tournaments/form/format-type-select";
import { FormatFamilySelect } from "@/components/tournaments/form/format-family-select";
import { CustomMeetingsFields } from "@/components/tournaments/form/custom-meetings-fields";
import { MatchScoringFields } from "@/components/tournaments/form/match-scoring-fields";
import { MexicanoSettingsFields } from "@/components/tournaments/form/mexicano-settings-fields";
import { OfficialFormatSummary } from "@/components/tournaments/form/official-format-summary";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import { CurrencyInput } from "@/components/tournaments/form/currency-input";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { TOURNAMENT_FIELD_LIMITS } from "@/lib/tournaments/form/field-limits";
import {
  TournamentCoverUpload,
  type TournamentCoverValue,
} from "@/components/tournaments/form/tournament-cover-upload";
import { revokeLocalPreviewUrl } from "@/lib/tournaments/cover-preview-url";
import { VenueAutocompleteField } from "@/components/tournaments/form/venue-autocomplete-field";
import { uploadTournamentCoverClient } from "@/lib/tournaments/upload-cover-client";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTournament, useUpdateAdminTournament } from "@/hooks/use-tournaments";
import {
  useCreateHostTournament,
  useUpdateHostTournament,
} from "@/hooks/use-host-tournaments";
import { adminRoutes, dashboardRoutes } from "@/lib/constants/routes";
import {
  tournamentAfterCreateUrl,
  tournamentAfterSaveUrl,
  tournamentListUrl,
  type TournamentEditWorkspace,
} from "@/lib/tournaments/edit-routes";
import {
  TOURNAMENT_COURT_COUNT_OPTIONS,
  TOURNAMENT_POINTS_PER_MATCH_OPTIONS,
  TOURNAMENT_ROUND_DURATION_OPTIONS,
  getTournamentRuleSections,
  getTournamentAllowedTierLevels,
  getTournamentCourtCount,
  getTournamentCustomMatchSettings,
  getTournamentFormatFamily,
  getTournamentFormatLabel,
  getTournamentMatchScoreMode,
  getTournamentMatchScoring,
  getTournamentMexicanoSettings,
  getTournamentPointsPerMatch,
  getTournamentRaceToTarget,
  getTournamentRoundDurationMinutes,
  getTournamentScoringType,
  getMaxRounds,
  getScoringTypeLabel,
  getVenueMapsUrl,
  isTournamentRankingOpen,
  type TournamentScoringType,
} from "@/lib/tournaments/settings";
import {
  defaultCustomMatchSettings,
  defaultMatchScoring,
  defaultMexicanoSettings,
  ensureDoubleStageScoringLeaves,
  formatHasGroupStage,
  formatHasKnockout,
  formatHasLobbyRounds,
  isFormatAllowedForFamily,
  matchScoreModeFromScoring,
  matchScoringForFormat,
  OFFICIAL_CREATABLE_FORMATS,
  resolveMatchScoringForStage,
  summarizeMatchScoring,
  type CustomMatchSettings,
  type MatchScoringConfig,
  type MexicanoSettings,
  type TournamentFormatFamily,
  type TournamentRankingMode,
} from "@/lib/tournaments/match-config";
import {
  RACE_TO_GAMES_COMMON_OPTIONS,
  RACE_TO_GAMES_OPTIONS,
  type MatchScoreMode,
  type RaceToGames,
} from "@/lib/tournaments/scoring/game-mode";
import { getDefaultStandingsScoringForSport } from "@/lib/tournaments/scoring/config";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getSportTournamentDefaults } from "@/lib/tournaments/sport-config";
import {
  isFunMatchType,
  isOfficialType,
  normalizeTournamentType,
} from "@/lib/tournaments/core/types";
import {
  type TournamentStatus,
  type TournamentType,
} from "@/lib/domain/tournaments";
import type { TournamentUpsertInput } from "@/lib/validations/tournaments";
import { slugifyWikiName } from "@/lib/wiki/slug";
import {
  matchPointsForTournamentTier,
  PLAYER_TIER_LABELS,
  type PlayerTierLevel,
} from "@/lib/player/tier";
import { parseDoubleStageSettings, parseStandingsScoring } from "@/lib/tournaments/scoring/config";
import { cn } from "@/lib/utils";
import { useDashboardSportOptional } from "@/providers/dashboard-sport-provider";

const STEPS = [
  { id: "basics", label: "Basics", shortLabel: "Basics" },
  { id: "schedule", label: "Schedule & rules", shortLabel: "Schedule" },
  { id: "review", label: "Review", shortLabel: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

const CATEGORY_OPTIONS = TOURNAMENT_CATEGORY_OPTIONS;
const MATCH_TYPE_OPTIONS = [
  { value: "americano", label: "Americano" },
  { value: "single_elimination", label: "Elimination" },
] as const;

/** Keeps legacy / unsupported stored formats out of the wizard select. */
function resolveCreatableFormat(
  format: string | null | undefined,
): TournamentUpsertInput["format"] | "" {
  if (!format) return "";
  return (OFFICIAL_CREATABLE_FORMATS as readonly string[]).includes(format)
    ? (format as TournamentUpsertInput["format"])
    : "";
}

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type TournamentCreateWizardProps = {
  sportSlug: string;
  onBack?: () => void;
  mode?: "admin" | "host";
  workspace?: TournamentEditWorkspace;
  initial?: TournamentDetail;
  tournamentId?: string;
  /** When false, hides the top “back to list” link (e.g. page provides its own). */
  showTopBack?: boolean;
  /** Pre-select tournament type on create (e.g. official-only flow from wiki entities). */
  initialTournamentType?: TournamentType;
  /** Lock type selector on create — used when admin picks official vs reclub upfront. */
  lockTournamentType?: boolean;
  /** Pre-select official billing when kind is chosen upfront (host create hub). */
  initialOfficialBilling?: "paid" | "free";
  /** Finished/cancelled events: browse settings, no save. */
  readOnly?: boolean;
};

export function TournamentCreateWizard({
  sportSlug,
  onBack,
  mode = "admin",
  workspace = "player",
  initial,
  tournamentId,
  showTopBack,
  initialTournamentType,
  initialOfficialBilling,
  readOnly = false,
}: TournamentCreateWizardProps) {
  const resolvedTournamentId = tournamentId ?? initial?.id ?? "";
  const isEdit = Boolean(resolvedTournamentId);
  const dashboardSport = useDashboardSportOptional();
  const resolvedSportSlug =
    isEdit || mode === "admin"
      ? sportSlug
      : (dashboardSport?.sportSlug ?? sportSlug);
  const adminCreate = useCreateTournament();
  const hostCreate = useCreateHostTournament();
  const adminUpdate = useUpdateAdminTournament(resolvedTournamentId);
  const hostUpdate = useUpdateHostTournament(resolvedTournamentId);
  const updateMutation = mode === "admin" ? adminUpdate : hostUpdate;
  const createMutation = mode === "host" ? hostCreate : adminCreate;
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStepId = STEPS[stepIndex]?.id ?? "basics";

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TournamentStatus>(initial?.status ?? "upcoming");
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    normalizeTournamentType(initial?.tournamentType ?? initialTournamentType ?? "official"),
  );
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [venueMapsUrl, setVenueMapsUrl] = useState(
    initial ? (getVenueMapsUrl(initial) ?? "") : "",
  );
  const [cover, setCover] = useState<TournamentCoverValue>(() => ({
    previewUrl: initial?.coverImageUrl ?? null,
    storageKey: initial?.coverImageStorageKey ?? null,
    pendingFile: null,
    removed: false,
  }));
  const [submitting, setSubmitting] = useState(false);
  const coverPreviewRef = useRef(cover.previewUrl);
  coverPreviewRef.current = cover.previewUrl;

  useEffect(() => {
    return () => revokeLocalPreviewUrl(coverPreviewRef.current);
  }, []);
  const initialRules = initial ? getTournamentRuleSections(initial) : null;
  const [rules, setRules] = useState(initial?.rules ?? "");
  const [matchFormatRules, setMatchFormatRules] = useState(
    initialRules?.matchFormatHtml ?? initial?.rules ?? "",
  );
  const [equipmentStandardsRules, setEquipmentStandardsRules] = useState(
    initialRules?.equipmentStandardsHtml ?? "",
  );
  const [startsAt, setStartsAt] = useState(toLocalDatetime(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalDatetime(initial?.endsAt));
  const [officialBilling, setOfficialBilling] = useState<"paid" | "free" | "">(
    (initial?.officialBilling as "paid" | "free" | null) ??
      initialOfficialBilling ??
      (initial?.registrationFeeIdr && initial.registrationFeeIdr > 0 ? "paid" : ""),
  );
  const [registrationFeeIdr, setRegistrationFeeIdr] = useState(
    initial?.registrationFeeIdr ? String(initial.registrationFeeIdr) : "",
  );
  const [prizePoolIdr, setPrizePoolIdr] = useState(
    initial?.prizePoolIdr ? String(initial.prizePoolIdr) : "",
  );
  const sportDefaults = getSportTournamentDefaults(resolvedSportSlug);
  const [maxTeams, setMaxTeams] = useState(
    String(initial?.maxTeams ?? sportDefaults.maxTeams),
  );
  const [playersPerTeam, setPlayersPerTeam] = useState(
    String(initial?.playersPerTeam ?? sportDefaults.playersPerTeam),
  );
  const [categoryLabel, setCategoryLabel] = useState<TournamentCategoryOption | "">(
    (initial?.categoryLabel as TournamentCategoryOption | "") ?? "",
  );
  const [registrationClosesAt, setRegistrationClosesAt] = useState(
    toLocalDatetime(initial?.registrationClosesAt),
  );
  const [matchType, setMatchType] = useState<TournamentUpsertInput["format"] | "">(() => {
    const existing = resolveCreatableFormat(initial?.format);
    if (existing) return existing;
    // Create Official: require an explicit format choice (no silent default).
    if (isOfficialType(initialTournamentType ?? "official")) return "";
    return sportDefaults.defaultFormat === "americano" ? "americano" : "single_elimination";
  });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    category?: string;
    format?: string;
    billing?: string;
    fee?: string;
    venue?: string;
    tiers?: string;
  }>({});
  const clearFieldError = (key: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const initialDs = initial
    ? parseDoubleStageSettings((initial.settings as Record<string, unknown>)?.doubleStage)
    : null;
  const initialStandings = initial
    ? parseStandingsScoring((initial.settings as Record<string, unknown>)?.standingsScoring)
    : null;
  const [maxTeamsPerGroup, setMaxTeamsPerGroup] = useState(
    String(initialDs?.maxTeamsPerGroup ?? 4),
  );
  const [teamsAdvancePerGroup, setTeamsAdvancePerGroup] = useState(
    String(initialDs?.teamsAdvancePerGroup ?? 2),
  );
  const [allowDraw, setAllowDraw] = useState(initialStandings?.allowDraw ?? false);
  const [thirdPlaceEnabled, setThirdPlaceEnabled] = useState(
    initialDs?.thirdPlaceEnabled ?? false,
  );
  const [scoringType, setScoringType] = useState<TournamentScoringType>(
    initial ? getTournamentScoringType(initial) : "points",
  );
  const [pointsPerMatch, setPointsPerMatch] = useState(
    String(initial ? getTournamentPointsPerMatch(initial) : 21),
  );
  const sportScoreUnit = getDefaultStandingsScoringForSport(resolvedSportSlug).scoreUnit;
  const sportPrefersGames = sportScoreUnit === "games" || sportScoreUnit === "sets";
  const [matchScoreMode, setMatchScoreMode] = useState<"points" | "games">(
    initial
      ? getTournamentMatchScoreMode(initial)
      : sportPrefersGames
        ? "games"
        : "points",
  );
  const [raceToGames, setRaceToGames] = useState(
    String(initial ? getTournamentRaceToTarget(initial) : 4),
  );
  const [courtCount, setCourtCount] = useState(
    String(initial ? getTournamentCourtCount(initial) : 1),
  );
  const [roundDurationMinutes, setRoundDurationMinutes] = useState(
    String(initial ? getTournamentRoundDurationMinutes(initial) : 15),
  );
  const [rankingMode, setRankingMode] = useState<TournamentRankingMode>(
    initial && isTournamentRankingOpen(initial) ? "open" : "tiered",
  );
  const [allowedTierLevels, setAllowedTierLevels] = useState<PlayerTierLevel[]>(
    () => {
      if (initial && isTournamentRankingOpen(initial)) return [];
      const existing = initial ? getTournamentAllowedTierLevels(initial) : null;
      if (existing?.length) return [existing[0]!];
      return ["bronze"];
    },
  );
  const [formatFamily, setFormatFamily] = useState<TournamentFormatFamily>(
    initial ? getTournamentFormatFamily(initial) : "original",
  );
  const [matchScoring, setMatchScoring] = useState<MatchScoringConfig>(
    () => (initial ? getTournamentMatchScoring(initial) : undefined) ?? defaultMatchScoring(),
  );
  const [customMatch, setCustomMatch] = useState<CustomMatchSettings>(() =>
    initial ? getTournamentCustomMatchSettings(initial) : defaultCustomMatchSettings(),
  );
  const [mexicano, setMexicano] = useState<MexicanoSettings>(
    () =>
      (initial ? getTournamentMexicanoSettings(initial) : undefined) ??
      defaultMexicanoSettings(),
  );
  const [americanoMaxRounds, setAmericanoMaxRounds] = useState(
    String(initial && initial.format === "americano" ? (getMaxRounds(initial) ?? 8) : 8),
  );

  const isOfficial = isOfficialType(tournamentType);
  const rankingTier = rankingMode === "open" ? null : (allowedTierLevels[0] ?? null);
  // Official events are driven by matchScoring; the clock/points pair only matters for
  // lobby-round formats (Americano / Mexicano) where rounds are timed or capped.
  const showLegacyClockFields = !isOfficial || formatHasLobbyRounds(matchType);

  const meetingsSummary = (() => {
    if (!isOfficial || formatFamily !== "custom" || !matchType) return undefined;
    const parts: string[] = [];
    if (formatHasGroupStage(matchType)) {
      parts.push(`${customMatch.groupMeetingsPerPair}× per pair in groups`);
    }
    if (formatHasKnockout(matchType)) {
      const legs = customMatch.knockoutLegsPerSlot;
      parts.push(`${legs} knockout leg${legs === 1 ? "" : "s"} per slot`);
    }
    return parts.length ? parts.join(" · ") : undefined;
  })();

  const handleRankingModeChange = (mode: TournamentRankingMode) => {
    clearFieldError("tiers");
    setRankingMode(mode);
    setAllowedTierLevels((prev) => {
      if (mode === "open") return [];
      return prev.length ? prev.slice(0, 1) : ["bronze"];
    });
  };

  const handleFormatFamilyChange = (family: TournamentFormatFamily) => {
    setFormatFamily(family);
    // Mexicano only exists under Original — drop an incompatible pick.
    if (matchType && !isFormatAllowedForFamily(family, matchType)) {
      clearFieldError("format");
      setMatchType("");
    }
  };

  useEffect(() => {
    if (isEdit) return;
    const prefers =
      getDefaultStandingsScoringForSport(resolvedSportSlug).scoreUnit === "games" ||
      getDefaultStandingsScoringForSport(resolvedSportSlug).scoreUnit === "sets";
    if (matchType === "double_stage" && prefers) {
      setMatchScoreMode("games");
      setRaceToGames("4");
    }
  }, [resolvedSportSlug, isEdit, matchType]);

  useEffect(() => {
    if (isEdit) return;
    const defaults = getSportTournamentDefaults(resolvedSportSlug);
    setPlayersPerTeam(String(defaults.playersPerTeam));
    setMaxTeams(String(defaults.maxTeams));
  }, [resolvedSportSlug, isEdit]);

  // Official race-to keeps the legacy race-to-games fields in sync (dual-write).
  useEffect(() => {
    if (!isOfficial || matchScoring.mode !== "race_to") return;
    const target = matchScoring.raceTo?.value;
    if (!target) return;
    setMatchScoreMode("games");
    if ((RACE_TO_GAMES_COMMON_OPTIONS as readonly number[]).includes(target)) {
      setRaceToGames(String(target));
    }
  }, [isOfficial, matchScoring]);

  useEffect(() => {
    if (!initial) return;
    setName(initial.name);
    setSlug(initial.slug);
    setSummary(initial.summary ?? "");
    setDescription(initial.description ?? "");
    setStatus(initial.status);
    setTournamentType(normalizeTournamentType(initial.tournamentType));
    setVenue(initial.venue ?? "");
    setVenueMapsUrl(getVenueMapsUrl(initial) ?? "");
    setCover({
      previewUrl: initial.coverImageUrl ?? null,
      storageKey: initial.coverImageStorageKey ?? null,
      pendingFile: null,
      removed: false,
    });
    const sections = getTournamentRuleSections(initial);
    setRules(initial.rules ?? "");
    setMatchFormatRules(sections.matchFormatHtml ?? initial.rules ?? "");
    setEquipmentStandardsRules(sections.equipmentStandardsHtml ?? "");
    setStartsAt(toLocalDatetime(initial.startsAt));
    setEndsAt(toLocalDatetime(initial.endsAt));
    setRegistrationFeeIdr(
      initial.registrationFeeIdr ? String(initial.registrationFeeIdr) : "",
    );
    setOfficialBilling(
      (initial.officialBilling as "paid" | "free" | null) ??
        (initial.registrationFeeIdr && initial.registrationFeeIdr > 0 ? "paid" : "free"),
    );
    setPrizePoolIdr(initial.prizePoolIdr ? String(initial.prizePoolIdr) : "");
    setMaxTeams(String(initial.maxTeams ?? sportDefaults.maxTeams));
    setPlayersPerTeam(String(initial.playersPerTeam ?? sportDefaults.playersPerTeam));
    setCategoryLabel((initial.categoryLabel as TournamentCategoryOption | "") ?? "");
    setRegistrationClosesAt(toLocalDatetime(initial.registrationClosesAt));
    setMatchType(resolveCreatableFormat(initial.format) || "single_elimination");
    setScoringType(getTournamentScoringType(initial));
    setPointsPerMatch(String(getTournamentPointsPerMatch(initial)));
    setMatchScoreMode(getTournamentMatchScoreMode(initial));
    setRaceToGames(String(getTournamentRaceToTarget(initial)));
    setCourtCount(String(getTournamentCourtCount(initial)));
    setRoundDurationMinutes(String(getTournamentRoundDurationMinutes(initial)));
    const rankingOpen = isTournamentRankingOpen(initial);
    setRankingMode(rankingOpen ? "open" : "tiered");
    setAllowedTierLevels(() => {
      if (rankingOpen) return [];
      const existing = getTournamentAllowedTierLevels(initial);
      if (existing?.length) return [existing[0]!];
      return ["bronze"];
    });
    setFormatFamily(getTournamentFormatFamily(initial));
    setMatchScoring(getTournamentMatchScoring(initial) ?? defaultMatchScoring());
    setCustomMatch(getTournamentCustomMatchSettings(initial));
    setMexicano(getTournamentMexicanoSettings(initial) ?? defaultMexicanoSettings());
  }, [initial, sportDefaults.maxTeams, sportDefaults.playersPerTeam]);

  const resolvedSlug = slug.trim() || slugifyWikiName(name);

  const buildPayload = (coverStorageKey: string | undefined): TournamentUpsertInput => {
    const toIso = (local: string) => {
      if (!local.trim()) return "";
      const d = new Date(local);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    };
    if (!matchType || !resolveCreatableFormat(matchType)) {
      throw new Error("Match format is required");
    }
    if (isOfficialType(tournamentType) && (officialBilling !== "paid" && officialBilling !== "free")) {
      throw new Error("Registration billing is required");
    }
    const groupWinPoints =
      isOfficialType(tournamentType) && rankingMode === "open"
        ? 3
        : isOfficialType(tournamentType)
          ? matchPointsForTournamentTier(allowedTierLevels[0] ?? "bronze")
          : 3;

    // Official matchScoring is the source of truth; dual-write legacy fields for engines that still read them.
    // Stage leaves only persist for Double Stage (strip otherwise so format switches stay safe).
    const scoringForPayload = matchScoringForFormat(
      matchType === "double_stage"
        ? ensureDoubleStageScoringLeaves(matchScoring)
        : matchScoring,
      matchType || "single_elimination",
    );
    type OfficialLegacyScoring = {
      matchScoreMode?: MatchScoreMode;
      raceToGames?: RaceToGames;
      raceToGamesGroup?: RaceToGames;
      raceToGamesKnockout?: RaceToGames;
      gameDecider?: "golden_point" | "star_point" | "advantage";
    };
    const officialLegacyScoring: OfficialLegacyScoring = (() => {
      if (!isOfficialType(tournamentType)) return {};
      const groupResolved = resolveMatchScoringForStage(scoringForPayload, "group")
        ?? scoringForPayload;
      const knockoutResolved = resolveMatchScoringForStage(scoringForPayload, "knockout")
        ?? scoringForPayload;
      const rootMode = matchScoreModeFromScoring(groupResolved) ?? "points";
      const toLegacy = (n: number | undefined): RaceToGames | undefined =>
        n != null && RACE_TO_GAMES_OPTIONS.includes(n as RaceToGames)
          ? (n as RaceToGames)
          : undefined;
      const groupRace =
        groupResolved.mode === "race_to" ? groupResolved.raceTo?.value : undefined;
      const knockoutRace =
        knockoutResolved.mode === "race_to"
          ? knockoutResolved.raceTo?.value
          : undefined;
      return {
        matchScoreMode: rootMode,
        ...(toLegacy(groupRace) != null ? { raceToGames: toLegacy(groupRace) } : {}),
        ...(matchType === "double_stage" && toLegacy(groupRace) != null
          ? { raceToGamesGroup: toLegacy(groupRace) }
          : {}),
        ...(matchType === "double_stage" && toLegacy(knockoutRace) != null
          ? { raceToGamesKnockout: toLegacy(knockoutRace) }
          : {}),
        ...(rootMode === "games"
          ? { gameDecider: "golden_point" as const }
          : {}),
      };
    })();

    return {
      name: name.trim(),
      slug: resolvedSlug,
      summary,
      description,
      status,
      tournamentType,
      officialBilling: isOfficialType(tournamentType)
        ? (officialBilling as "paid" | "free")
        : null,
      format: matchType,
      rules: isFunMatchType(tournamentType) ? rules : undefined,
      eligibilityRules: isOfficialType(tournamentType) ? "" : undefined,
      matchFormatRules: isOfficialType(tournamentType) ? matchFormatRules : rules,
      equipmentStandardsRules:
        isOfficialType(tournamentType) ? equipmentStandardsRules : undefined,
      venue,
      venueMapsUrl: venueMapsUrl.trim() || undefined,
      coverImageStorageKey: coverStorageKey,
      maxTeams: maxTeams ? Number(maxTeams) : undefined,
      playersPerTeam: Number(playersPerTeam) || 2,
      registrationFeeIdr:
        isOfficialType(tournamentType) && officialBilling === "paid" && registrationFeeIdr
          ? Number(registrationFeeIdr)
          : isOfficialType(tournamentType) && officialBilling === "free"
            ? 0
            : undefined,
      prizePoolIdr: prizePoolIdr ? Number(prizePoolIdr) : undefined,
      categoryLabel: categoryLabel || undefined,
      allowedTierLevels:
        isOfficialType(tournamentType) && rankingMode !== "open"
          ? allowedTierLevels.slice(0, 1)
          : undefined,
      registrationClosesAt: toIso(registrationClosesAt),
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
      scoringType,
      pointsPerMatch: Number(pointsPerMatch) || 21,
      roundDurationMinutes:
        scoringType === "timed" ? Number(roundDurationMinutes) || 15 : undefined,
      courtCount: Number(courtCount) || 1,
      ...(matchType === "double_stage"
        ? {
            maxTeamsPerGroup: Number(maxTeamsPerGroup) || 4,
            teamsAdvancePerGroup: Number(teamsAdvancePerGroup) || 2,
            allowDraw,
            winPoints: groupWinPoints,
            drawPoints: allowDraw ? 1 : 0,
            lossPoints: 0,
            thirdPlaceEnabled,
            matchScoreMode:
              officialLegacyScoring.matchScoreMode ?? matchScoreMode,
            raceToGames:
              officialLegacyScoring.raceToGames ??
              (matchScoreMode === "games"
                ? (Number(raceToGames) as RaceToGames)
                : undefined),
            raceToGamesGroup: officialLegacyScoring.raceToGamesGroup,
            raceToGamesKnockout: officialLegacyScoring.raceToGamesKnockout,
            gameDecider:
              officialLegacyScoring.gameDecider ??
              (matchScoreMode === "games" ? "golden_point" : undefined),
          }
        : {}),
      ...(matchType === "group_only"
        ? {
            maxTeamsPerGroup: Number(maxTeamsPerGroup) || 4,
            allowDraw,
            winPoints: groupWinPoints,
            drawPoints: allowDraw ? 1 : 0,
            lossPoints: 0,
            matchScoreMode:
              officialLegacyScoring.matchScoreMode ?? matchScoreMode,
            raceToGames:
              officialLegacyScoring.raceToGames ??
              (matchScoreMode === "games"
                ? (Number(raceToGames) as RaceToGames)
                : undefined),
            gameDecider:
              officialLegacyScoring.gameDecider ??
              (matchScoreMode === "games" ? "golden_point" : undefined),
          }
        : {}),
      ...(isOfficialType(tournamentType)
        ? {
            rankingMode,
            formatFamily,
            matchScoring: scoringForPayload,
            ...(formatFamily === "custom" ? { customMatch } : {}),
            ...(matchType === "mexicano"
              ? { mexicano, maxRounds: mexicano.roundCount }
              : {}),
            ...(matchType === "americano"
              ? { maxRounds: Number(americanoMaxRounds) || 8 }
              : {}),
            ...(!matchType ||
            matchType === "double_stage" ||
            matchType === "group_only"
              ? {}
              : {
                  matchScoreMode: officialLegacyScoring.matchScoreMode,
                  raceToGames: officialLegacyScoring.raceToGames,
                  gameDecider: officialLegacyScoring.gameDecider,
                }),
          }
        : {}),
    };
  };

  const validateStepById = (stepId: StepId): boolean => {
    const limitError = (field: string, max: number) => {
      toast.error(`${field} must be at most ${max.toLocaleString()} characters`);
    };

    if (stepId === "basics") {
      const nextErrors: typeof fieldErrors = {};

      if (!name.trim()) {
        nextErrors.name = "Tournament name is required";
      } else if (name.length > TOURNAMENT_FIELD_LIMITS.name) {
        limitError("Name", TOURNAMENT_FIELD_LIMITS.name);
        return false;
      }

      if (tournamentType === "official") {
        if (officialBilling !== "paid" && officialBilling !== "free") {
          nextErrors.billing = "Select paid or free registration billing";
        }
        if (
          officialBilling === "paid" &&
          (!registrationFeeIdr || Number(registrationFeeIdr) <= 0)
        ) {
          nextErrors.fee = "Paid tournaments require a registration fee (IDR)";
        }
        if (!CATEGORY_OPTIONS.includes(categoryLabel as TournamentCategoryOption)) {
          nextErrors.category = "Choose a category: Male, Female, or Mix";
        }
        if (rankingMode !== "open" && allowedTierLevels.length !== 1) {
          nextErrors.tiers = "Select one tournament skill tier, or No Rank";
        }
        if (!matchType || !resolveCreatableFormat(matchType)) {
          nextErrors.format = "Choose a match format";
        } else if (!isFormatAllowedForFamily(formatFamily, matchType)) {
          nextErrors.format =
            formatFamily === "custom"
              ? "Custom match does not support Mexicano — pick another format"
              : "Selected format is not available for this match family";
        }
      } else if (
        matchType !== "americano" &&
        matchType !== "single_elimination" &&
        matchType !== "double_stage"
      ) {
        nextErrors.format = "Choose a match type";
      }

      if (categoryLabel.length > TOURNAMENT_FIELD_LIMITS.categoryLabel) {
        limitError("Category label", TOURNAMENT_FIELD_LIMITS.categoryLabel);
        return false;
      }

      if (!TOURNAMENT_POINTS_PER_MATCH_OPTIONS.includes(Number(pointsPerMatch) as (typeof TOURNAMENT_POINTS_PER_MATCH_OPTIONS)[number])) {
        // Official scoring is driven by matchScoring; legacy points only matter for lobby clock UIs.
        if (!isOfficial || showLegacyClockFields) {
          toast.error("Choose a supported point per match value");
          return false;
        }
      }
      const courts = Number(courtCount);
      if (!Number.isFinite(courts) || courts < 1 || courts > 12) {
        toast.error("Number of courts must be between 1 and 12");
        return false;
      }
      if (summary.length > TOURNAMENT_FIELD_LIMITS.summary) {
        limitError("Summary", TOURNAMENT_FIELD_LIMITS.summary);
        return false;
      }
      if (description.length > TOURNAMENT_FIELD_LIMITS.description) {
        limitError("Description", TOURNAMENT_FIELD_LIMITS.description);
        return false;
      }
      if (resolvedSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
        toast.error("Invalid URL slug");
        return false;
      }
      if (!venue.trim()) {
        nextErrors.venue = "Venue is required";
      } else if (venue.length > TOURNAMENT_FIELD_LIMITS.venue) {
        limitError("Venue", TOURNAMENT_FIELD_LIMITS.venue);
        return false;
      }

      if (matchType === "double_stage") {
        const maxPer = Number(maxTeamsPerGroup) || 0;
        const advance = Number(teamsAdvancePerGroup) || 0;
        if (advance > maxPer) {
          toast.error("Teams advancing per group cannot exceed max teams per group");
          return false;
        }
      }

      setFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        const first = Object.values(nextErrors)[0];
        if (first) toast.error(first);
        return false;
      }
    }
    if (stepId === "schedule") {
      if (!startsAt.trim()) {
        toast.error("Start date is required");
        return false;
      }
      if (!endsAt.trim()) {
        toast.error("End date is required");
        return false;
      }
      if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
        toast.error("End date must be after start date");
        return false;
      }
      if (
        registrationClosesAt &&
        endsAt &&
        new Date(registrationClosesAt) > new Date(endsAt)
      ) {
        toast.error("Registration must close on or before the tournament end");
        return false;
      }
      if (tournamentType === "official") {
        if (matchFormatRules.length > TOURNAMENT_FIELD_LIMITS.matchFormatRules) {
          limitError("Match format rules", TOURNAMENT_FIELD_LIMITS.matchFormatRules);
          return false;
        }
        if (equipmentStandardsRules.length > TOURNAMENT_FIELD_LIMITS.equipmentStandardsRules) {
          limitError("Equipment standards", TOURNAMENT_FIELD_LIMITS.equipmentStandardsRules);
          return false;
        }
      } else if (rules.length > TOURNAMENT_FIELD_LIMITS.rules) {
        limitError("Tournament rules", TOURNAMENT_FIELD_LIMITS.rules);
        return false;
      }
    }
    return true;
  };

  const validateStep = (): boolean => validateStepById(currentStepId);

  const validateAllSteps = (): boolean => {
    for (let i = 0; i < STEPS.length; i++) {
      const stepId = STEPS[i]?.id;
      if (!stepId || !validateStepById(stepId)) {
        setStepIndex(i);
        return false;
      }
    }
    return true;
  };

  const goToStep = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= STEPS.length) return;
    if (targetIndex === stepIndex) return;
    if (targetIndex < stepIndex) {
      setStepIndex(targetIndex);
      return;
    }
    for (let i = stepIndex; i < targetIndex; i++) {
      const stepId = STEPS[i]?.id;
      if (!stepId || !validateStepById(stepId)) {
        setStepIndex(i);
        return;
      }
    }
    setStepIndex(targetIndex);
  };

  const listBackHref = isEdit
    ? mode === "admin"
      ? adminRoutes.wikiEntities
      : tournamentListUrl(workspace)
    : mode === "host"
      ? dashboardRoutes.hostTournaments
      : adminRoutes.wikiEntities;

  const listBackLabel =
    mode === "host" || workspace === "host" ? "My tournaments" : "Back to tournaments";

  const visibilityLabel =
    status === "draft" ? "Draft — hidden until published" : "Published — auto status from dates";

  const resolveCoverStorageKey = async (): Promise<string | undefined> => {
    if (cover.removed && !cover.pendingFile) return undefined;
    if (cover.pendingFile) {
      const uploaded = await uploadTournamentCoverClient(
        cover.pendingFile,
        resolvedSportSlug,
        resolvedTournamentId || undefined,
      );
      return uploaded.storageKey;
    }
    return cover.storageKey?.trim() || undefined;
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    if (submitLockRef.current) return;
    if (!validateAllSteps()) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const coverKey = await resolveCoverStorageKey();
      const payload = buildPayload(coverKey);

      if (isEdit) {
        const updated = await updateMutation.mutateAsync(payload);
        if (mode === "admin") {
          router.push(adminRoutes.wikiEntities);
        } else {
          router.push(
            tournamentAfterSaveUrl(workspace, {
              sportSlug: updated.sportSlug,
              slug: updated.slug,
            }),
          );
        }
        return;
      }

      const tournament = await createMutation.mutateAsync(payload);
      if (mode === "host") {
        router.push(tournamentAfterCreateUrl("host", tournament));
      } else {
        router.push(tournamentAfterCreateUrl(workspace, tournament));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save tournament");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const isPending =
    submitting || (isEdit ? updateMutation.isPending : createMutation.isPending);
  const isLast = stepIndex >= STEPS.length - 1;
  const shouldShowTopBack = showTopBack ?? true;

  const topBackLabel = onBack && !isEdit ? "Back" : listBackLabel;

  return (
    <div className="mx-auto w-full max-w-4xl">
      {shouldShowTopBack ? (
        onBack && !isEdit ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {topBackLabel}
          </button>
        ) : (
          <Link
            href={listBackHref}
            className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {topBackLabel}
          </Link>
        )
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm",
          shouldShowTopBack && "mt-6",
        )}
      >
        <div className="border-b border-cp-border bg-cp-elevated/50 px-3 py-3 sm:px-5 sm:py-5">
          <WikiStepper
            steps={[...STEPS]}
            currentIndex={stepIndex}
            onStepClick={goToStep}
            layout="segmented"
          />
        </div>

        <div className="bg-cp-card/50 p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {currentStepId === "basics" ? (
                <>
                  <TournamentWizardStepHeader
                    eyebrow="Step 1"
                    title="Tournament basics"
                    description={`${isEdit ? "Update" : "Create"} a tournament for ${resolvedSportSlug}. Set the name, fees, capacity, and public description.`}
                  />
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="t-name">
                      Name
                      <RequiredMark />
                    </Label>
                    <FieldCharCounter current={name.length} max={TOURNAMENT_FIELD_LIMITS.name} />
                  </div>
                  <Input
                    id="t-name"
                    value={name}
                    onChange={(e) => {
                      clearFieldError("name");
                      setName(e.target.value.slice(0, TOURNAMENT_FIELD_LIMITS.name));
                    }}
                    placeholder="Premier Padel Open 2026"
                    maxLength={TOURNAMENT_FIELD_LIMITS.name}
                    aria-invalid={fieldErrors.name ? true : undefined}
                    aria-describedby={fieldErrors.name ? "t-name-error" : undefined}
                    className={cn(
                      "border-cp-border bg-cp-elevated",
                      fieldErrors.name && "border-red-500/70 focus-visible:ring-red-500/40",
                    )}
                  />
                  <FieldError id="t-name-error" message={fieldErrors.name} />
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={status === "draft" ? "draft" : "scheduled"}
                    onValueChange={(v) =>
                      setStatus(v === "draft" ? "draft" : "upcoming")
                    }
                  >
                    <SelectTrigger className="border-cp-border bg-cp-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Published — auto status from dates</SelectItem>
                      <SelectItem value="draft">Draft — hidden until you publish</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-cp-muted">
                    Live / upcoming / completed is set automatically from start and end dates.
                  </p>
                </div>
                {tournamentType === "official" ? (
                  <>
                    <div className="sm:col-span-2">
                      <BillingTypeSelect
                        value={officialBilling}
                        onChange={(v) => {
                          clearFieldError("billing");
                          clearFieldError("fee");
                          setOfficialBilling(v);
                        }}
                        required
                        error={fieldErrors.billing}
                      />
                    </div>
                    {officialBilling === "paid" ? (
                    <div className="space-y-2">
                      <Label>
                        Registration fee (IDR)
                        <RequiredMark />
                      </Label>
                      <CurrencyInput
                        value={registrationFeeIdr}
                        onChange={(v) => {
                          clearFieldError("fee");
                          setRegistrationFeeIdr(v);
                        }}
                      />
                      <FieldError message={fieldErrors.fee} />
                    </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label>
                        Prize pool (IDR)
                        {officialBilling === "free" ? (
                          <span className="ml-1 font-normal text-cp-muted">(optional)</span>
                        ) : null}
                      </Label>
                      <CurrencyInput value={prizePoolIdr} onChange={setPrizePoolIdr} />
                    </div>
                    <CategorySelect
                      value={categoryLabel}
                      onChange={(v) => {
                        clearFieldError("category");
                        setCategoryLabel(v);
                      }}
                      className="sm:col-span-2"
                      required
                      error={fieldErrors.category}
                    />
                    <AllowedTierLevelsSelect
                      value={allowedTierLevels}
                      onChange={(value) => {
                        clearFieldError("tiers");
                        setAllowedTierLevels(value.slice(0, 1));
                      }}
                      className="sm:col-span-2"
                      required
                      mode="single"
                      error={fieldErrors.tiers}
                      rankingMode={rankingMode}
                      onRankingModeChange={handleRankingModeChange}
                      description="Official tournaments (paid and free) use one skill tier. Only players at that exact tier can register. Ranking points: win adds / loss subtracts the tier value."
                    />
                    <FormatFamilySelect
                      value={formatFamily}
                      onChange={handleFormatFamilyChange}
                      className="sm:col-span-2"
                      required
                    />
                  </>
                ) : null}
                <div className="sm:col-span-2">
                  <FormatTypeSelect
                    value={matchType}
                    onChange={(v) => {
                      clearFieldError("format");
                      setMatchType(v);
                      // Keep stage race-to leaves in sync with Double Stage only —
                      // avoids leaking group/KO targets into SE / group-only / lobby.
                      setMatchScoring((prev) => {
                        if (v === "double_stage") {
                          return ensureDoubleStageScoringLeaves(prev);
                        }
                        return matchScoringForFormat(prev, v || "single_elimination");
                      });
                    }}
                    sportSlug={resolvedSportSlug}
                    officialOnly={isOfficial}
                    formatFamily={isOfficial ? formatFamily : undefined}
                    required={isOfficial}
                    error={fieldErrors.format}
                  />
                </div>
                {isOfficial && formatFamily === "custom" && matchType ? (
                  <CustomMeetingsFields
                    className="sm:col-span-2"
                    showGroupMeetings={formatHasGroupStage(matchType)}
                    showKnockoutLegs={formatHasKnockout(matchType)}
                    groupMeetingsPerPair={customMatch.groupMeetingsPerPair}
                    knockoutLegsPerSlot={customMatch.knockoutLegsPerSlot}
                    onGroupMeetingsChange={(groupMeetingsPerPair) =>
                      setCustomMatch((prev) => ({ ...prev, groupMeetingsPerPair }))
                    }
                    onKnockoutLegsChange={(knockoutLegsPerSlot) =>
                      setCustomMatch((prev) => ({ ...prev, knockoutLegsPerSlot }))
                    }
                  />
                ) : null}
                {isOfficial && matchType === "mexicano" ? (
                  <MexicanoSettingsFields
                    className="sm:col-span-2"
                    value={mexicano}
                    onChange={setMexicano}
                  />
                ) : null}
                {isOfficial && matchType === "americano" ? (
                  <div className="space-y-2 sm:col-span-2 sm:max-w-xs">
                    <Label htmlFor="americano-max-rounds">Number of session rounds</Label>
                    <Input
                      id="americano-max-rounds"
                      type="number"
                      min={1}
                      max={99}
                      value={americanoMaxRounds}
                      onChange={(e) => setAmericanoMaxRounds(e.target.value)}
                      className="border-cp-border bg-cp-elevated"
                    />
                    <p className="text-xs text-cp-muted">
                      Caps Live scoring round tabs (same as Fun Match). Courts set how many matches
                      run in parallel each round.
                    </p>
                  </div>
                ) : null}
                {isOfficial ? (
                  <MatchScoringFields
                    className="sm:col-span-2"
                    value={matchScoring}
                    onChange={setMatchScoring}
                    showStageOverrides={matchType === "double_stage"}
                    showKnockoutRoundTargets={
                      matchType === "single_elimination" || matchType === "double_stage"
                    }
                    knockoutFieldSize={Number(maxTeams) || 32}
                  />
                ) : null}
                {matchType === "double_stage" || matchType === "group_only" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Max teams per group</Label>
                      <Input
                        type="number"
                        min={2}
                        max={8}
                        value={maxTeamsPerGroup}
                        onChange={(e) => setMaxTeamsPerGroup(e.target.value)}
                        className="border-cp-border bg-cp-elevated"
                      />
                    </div>
                    {matchType === "double_stage" ? (
                      <div className="space-y-2">
                        <Label>Teams advancing per group</Label>
                        <Input
                          type="number"
                          min={1}
                          max={4}
                          value={teamsAdvancePerGroup}
                          onChange={(e) => setTeamsAdvancePerGroup(e.target.value)}
                          className="border-cp-border bg-cp-elevated"
                        />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        id="allow-draw"
                        type="checkbox"
                        checked={allowDraw}
                        onChange={(e) => setAllowDraw(e.target.checked)}
                        className="h-4 w-4 rounded border-cp-border"
                      />
                      <Label htmlFor="allow-draw">
                        Allow draw results in group stage
                        <span className="mt-0.5 block text-[11px] font-normal text-cp-muted">
                          When off, tied games cannot be finalized (must have a winner).
                        </span>
                      </Label>
                    </div>
                  </>
                ) : null}
                {matchType === "double_stage" ? (
                  <>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        id="third-place"
                        type="checkbox"
                        checked={thirdPlaceEnabled}
                        onChange={(e) => setThirdPlaceEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-cp-border"
                      />
                      <Label htmlFor="third-place">
                        Include 3rd place match
                        <span className="mt-0.5 block text-[11px] font-normal text-cp-muted">
                          Adds a bronze match in the knockout bracket when enabled.
                        </span>
                      </Label>
                    </div>
                    {!isOfficial ? (
                      <>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Match score format</Label>
                          <p className="text-xs text-cp-muted">
                            For racket sports like padel, use Race to N games (games score like
                            4–1). Point scoring keeps a flat race-to-points total.
                          </p>
                          <Select
                            value={matchScoreMode}
                            onValueChange={(v) => setMatchScoreMode(v as "points" | "games")}
                          >
                            <SelectTrigger className="border-cp-border bg-cp-elevated">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="games">Race to games (e.g. padel 4 / 6)</SelectItem>
                              <SelectItem value="points">Flat points (Americano-style)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {matchScoreMode === "games" ? (
                          <div className="space-y-2">
                            <Label>Race to</Label>
                            <Select value={raceToGames} onValueChange={setRaceToGames}>
                              <SelectTrigger className="border-cp-border bg-cp-elevated">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RACE_TO_GAMES_COMMON_OPTIONS.map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    Race to {n} games
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-cp-muted">
                              Points rise +1 through 15 → 30 → 40. First to 40 wins the game (score
                              stays until Next game); first to {raceToGames} games wins the match.
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}
                {showLegacyClockFields ? (
                  <>
                    <div className="space-y-2">
                      <Label>Scoring type</Label>
                      <Select
                        value={scoringType}
                        onValueChange={(v) => setScoringType(v as TournamentScoringType)}
                      >
                        <SelectTrigger className="border-cp-border bg-cp-elevated">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="timed">Timed rounds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      {scoringType === "timed" ? (
                        <>
                          <Label>Round duration</Label>
                          <Select
                            value={roundDurationMinutes}
                            onValueChange={setRoundDurationMinutes}
                          >
                            <SelectTrigger className="border-cp-border bg-cp-elevated">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TOURNAMENT_ROUND_DURATION_OPTIONS.map((minutes) => (
                                <SelectItem key={minutes} value={String(minutes)}>
                                  {minutes} minutes
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <>
                          <Label>Point per match</Label>
                          <Select value={pointsPerMatch} onValueChange={setPointsPerMatch}>
                            <SelectTrigger className="border-cp-border bg-cp-elevated">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TOURNAMENT_POINTS_PER_MATCH_OPTIONS.map((points) => (
                                <SelectItem key={points} value={String(points)}>
                                  {points} points
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label>Number of courts</Label>
                  <Select value={courtCount} onValueChange={setCourtCount}>
                    <SelectTrigger className="border-cp-border bg-cp-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOURNAMENT_COURT_COUNT_OPTIONS.map((count) => (
                        <SelectItem key={count} value={String(count)}>
                          {count} {count === 1 ? "court" : "courts"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-max-teams">Max teams</Label>
                  <Input
                    id="t-max-teams"
                    type="number"
                    min={2}
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(e.target.value)}
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-ppt">Players per team</Label>
                  <Input
                    id="t-ppt"
                    type="number"
                    min={1}
                    max={12}
                    value={playersPerTeam}
                    onChange={(e) => setPlayersPerTeam(e.target.value)}
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
              </div>

              <div>
                <Label>Short summary</Label>
                <p className="mb-2 text-xs text-cp-muted">Shown on listings and cards.</p>
                <RichTextEditor
                  value={summary}
                  onChange={setSummary}
                  placeholder="One-line pitch for this event"
                  minHeight={100}
                  maxLength={TOURNAMENT_FIELD_LIMITS.summary}
                />
              </div>

              <div>
                <Label>Description</Label>
                <p className="mb-2 text-xs text-cp-muted">Full overview shown on the tournament page.</p>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Overview, format, prizes…"
                  minHeight={160}
                  maxLength={TOURNAMENT_FIELD_LIMITS.description}
                />
              </div>

              <TournamentCoverUpload value={cover} onChange={setCover} />

              <VenueAutocompleteField
                venue={venue}
                mapsUrl={venueMapsUrl}
                onVenueChange={(v) => {
                  clearFieldError("venue");
                  setVenue(v.slice(0, TOURNAMENT_FIELD_LIMITS.venue));
                }}
                onMapsUrlChange={(v) => setVenueMapsUrl(v.slice(0, 2000))}
                required
                fieldError={fieldErrors.venue}
              />
                  </div>
                </>
              ) : null}

              {currentStepId === "schedule" ? (
                <>
                  <TournamentWizardStepHeader
                    eyebrow="Step 2"
                    title="Schedule & rules"
                    description="Set dates and official rules players must follow."
                  />
                  <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <DateTimePicker label="Starts" value={startsAt} onChange={setStartsAt} />
                <DateTimePicker label="Ends" value={endsAt} onChange={setEndsAt} min={startsAt} />
                {tournamentType === "official" ? (
                  <div className="sm:col-span-2">
                    <DateTimePicker
                      label="Registration closes"
                      value={registrationClosesAt}
                      onChange={setRegistrationClosesAt}
                      disabled={
                        isEdit &&
                        (initial?.status === "live" || initial?.status === "completed")
                      }
                    />
                    {isEdit &&
                    (initial?.status === "live" || initial?.status === "completed") ? (
                      <p className="mt-1 text-xs text-amber-400">
                        Registration dates cannot be changed while the tournament is live or
                        completed.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {tournamentType === "official" ? (
                <div className="space-y-6">
                  <OfficialFormatSummary
                    formatFamily={formatFamily}
                    format={matchType}
                    rankingMode={rankingMode}
                    allowedTier={rankingTier}
                    matchScoring={matchScoring}
                    customMatch={customMatch}
                    mexicano={matchType === "mexicano" ? mexicano : null}
                  />
                  <div>
                    <Label>
                      Additional match notes
                      <span className="ml-1 font-normal text-cp-muted">(optional)</span>
                    </Label>
                    <p className="mb-2 text-xs text-cp-muted">
                      Structured scoring comes from Basics. Use this for host remarks only — warm-up
                      time, ball brand, walkover policy.
                    </p>
                    <RichTextEditor
                      value={matchFormatRules}
                      onChange={setMatchFormatRules}
                      placeholder="Optional notes for players…"
                      minHeight={120}
                      maxLength={TOURNAMENT_FIELD_LIMITS.matchFormatRules}
                    />
                  </div>
                  <div>
                    <Label>Equipment standards</Label>
                    <p className="mb-2 text-xs text-cp-muted">
                      Required gear, inspections, and non-compliance policy.
                    </p>
                    <RichTextEditor
                      value={equipmentStandardsRules}
                      onChange={setEquipmentStandardsRules}
                      placeholder="Equipment requirements…"
                      minHeight={140}
                      maxLength={TOURNAMENT_FIELD_LIMITS.equipmentStandardsRules}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Tournament rules</Label>
                  <RichTextEditor
                    value={rules}
                    onChange={setRules}
                    placeholder="Document the rules players must follow"
                    minHeight={200}
                    maxLength={TOURNAMENT_FIELD_LIMITS.rules}
                  />
                </div>
              )}
                  </div>
                </>
              ) : null}

              {currentStepId === "review" ? (
                <TournamentWizardReview
              name={name}
              sportSlug={resolvedSportSlug}
              tournamentType={tournamentType}
              statusLabel={STATUS_LABELS[status]}
              visibilityLabel={visibilityLabel}
              venue={venue}
              venueMapsUrl={venueMapsUrl}
              coverPreviewUrl={cover.previewUrl}
              showCover={Boolean(cover.previewUrl && !cover.removed)}
              registrationFeeIdr={registrationFeeIdr}
              prizePoolIdr={prizePoolIdr}
              categoryLabel={categoryLabel}
              maxTeams={maxTeams}
              playersPerTeam={playersPerTeam}
              startsAt={startsAt}
              endsAt={endsAt}
              registrationClosesAt={registrationClosesAt}
              summary={summary}
              description={description}
              matchFormatRules={matchFormatRules}
              equipmentStandardsRules={equipmentStandardsRules}
              rules={rules}
              matchTypeLabel={
                matchType ? getTournamentFormatLabel(matchType) : "—"
              }
              scoringTypeLabel={getScoringTypeLabel(scoringType)}
              pointsPerMatch={
                scoringType === "timed"
                  ? `${roundDurationMinutes} min rounds`
                  : matchType === "double_stage" && matchScoreMode === "games"
                    ? `Race to ${raceToGames} games`
                    : `${pointsPerMatch} points`
              }
              courtCount={courtCount}
              hideLegacyScoringInCapacity={isOfficial}
              officialBillingLabel={
                isOfficial
                  ? officialBilling === "paid"
                    ? "Paid"
                    : officialBilling === "free"
                      ? "Free"
                      : "—"
                  : undefined
              }
              formatFamilyLabel={
                isOfficial ? (formatFamily === "custom" ? "Custom" : "Original") : undefined
              }
              rankingTierLabel={
                isOfficial
                  ? rankingMode === "open"
                    ? "No Rank (open)"
                    : rankingTier
                      ? PLAYER_TIER_LABELS[rankingTier]
                      : "—"
                  : undefined
              }
              matchScoringLabel={isOfficial ? summarizeMatchScoring(matchScoring) : undefined}
              meetingsSummary={meetingsSummary}
              mexicanoLabel={
                isOfficial && matchType === "mexicano"
                  ? `${mexicano.mode === "individual" ? "Individual" : "Team"} · ${mexicano.roundCount} rounds`
                  : undefined
              }
              lobbyClockLabel={
                isOfficial && showLegacyClockFields
                  ? scoringType === "timed"
                    ? `${roundDurationMinutes} min rounds`
                    : `${pointsPerMatch} points per match`
                  : undefined
              }
              onEditStep={goToStep}
            />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <TournamentWizardFooter
          backHref={onBack ? undefined : listBackHref}
          backLabel={onBack ? "Change classification" : listBackLabel}
          onBackLink={onBack}
          showStepBack={stepIndex > 0}
          onStepBack={() => setStepIndex((s) => Math.max(0, s - 1))}
          isLast={isLast}
          onNext={() => {
            if (!validateStep()) return;
            setStepIndex((s) => s + 1);
          }}
          onSubmit={() => void handleSubmit()}
          isPending={isPending}
          isEdit={isEdit}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
