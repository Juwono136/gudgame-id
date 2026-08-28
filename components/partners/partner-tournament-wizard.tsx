"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { WikiStepper } from "@/components/admin/wiki/wiki-stepper";
import { TournamentWizardFooter } from "@/components/admin/tournaments/tournament-wizard-footer";
import { TournamentWizardStepHeader } from "@/components/admin/tournaments/tournament-wizard-step-header";
import {
  CategorySelect,
  TOURNAMENT_CATEGORY_OPTIONS,
  type TournamentCategoryOption,
} from "@/components/tournaments/form/category-select";
import { BillingTypeSelect } from "@/components/tournaments/form/billing-type-select";
import { CurrencyInput } from "@/components/tournaments/form/currency-input";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { FormatFamilySelect } from "@/components/tournaments/form/format-family-select";
import { CustomMeetingsFields } from "@/components/tournaments/form/custom-meetings-fields";
import { MatchScoringFields } from "@/components/tournaments/form/match-scoring-fields";
import { MexicanoSettingsFields } from "@/components/tournaments/form/mexicano-settings-fields";
import { OfficialFormatSummary } from "@/components/tournaments/form/official-format-summary";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import {
  TournamentCoverUpload,
  type TournamentCoverValue,
} from "@/components/tournaments/form/tournament-cover-upload";
import { VenueAutocompleteField } from "@/components/tournaments/form/venue-autocomplete-field";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerTournamentLeagueField } from "@/components/partners/partner-tournament-league-field";
import { PartnerTournamentWizardReview } from "@/components/partners/partner-tournament-wizard-review";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import type { TournamentFormat } from "@/lib/domain/tournaments";
import { FormatTypeSelect } from "@/components/tournaments/form/format-type-select";
import {
  defaultCustomMatchSettings,
  defaultMatchScoring,
  defaultMexicanoSettings,
  ensureDoubleStageScoringLeaves,
  formatHasGroupStage,
  formatHasKnockout,
  isFormatAllowedForFamily,
  matchScoringForFormat,
  matchScoreModeFromScoring,
  resolveMatchScoringForStage,
  summarizeMatchScoring,
  type CustomMatchSettings,
  type MatchScoringConfig,
  type MexicanoSettings,
  type TournamentFormatFamily,
} from "@/lib/tournaments/match-config";
import {
  TOURNAMENT_COURT_COUNT_OPTIONS,
  getTournamentCourtCount,
  getTournamentFormatLabel,
  getTournamentFormatFamily,
  getTournamentCustomMatchSettings,
  getTournamentMatchScoring,
  getTournamentMexicanoSettings,
  getTournamentScoreEntryMode,
  getMaxRounds,
  parseTournamentSettings,
} from "@/lib/tournaments/settings";
import { parseDoubleStageSettings } from "@/lib/tournaments/scoring/config";
import {
  defaultModifiedSwissMatchScoring,
  defaultBestieCupDoubleStageMatchScoring,
  bestieCupWizardDefaults,
  BESTIE_CUP_TOTAL_PAIRS,
} from "@/lib/tournaments/partner/bestie-cup-config";
import { RACE_TO_GAMES_OPTIONS, type RaceToGames } from "@/lib/tournaments/scoring/game-mode";
import {
  TOURNAMENT_FIELD_LIMITS,
  htmlCharCount,
} from "@/lib/tournaments/form/field-limits";
import { uploadTournamentCoverClient } from "@/lib/tournaments/upload-cover-client";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  formatPartnerScheduleLabel,
  validatePartnerTournamentSchedule,
} from "@/lib/partners/tournament-schedule";
import { partnerPageWidthClass } from "@/lib/partners/layout";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "basics", label: "Event info", shortLabel: "Info" },
  { id: "format", label: "Format & capacity", shortLabel: "Format" },
  { id: "review", label: "Review", shortLabel: "Review" },
] as const;

const MAX_TEAMS_MIN = 4;
const MAX_TEAMS_MAX = 64;

function parseMaxTeamsInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function clampMaxTeams(n: number): number {
  return Math.min(MAX_TEAMS_MAX, Math.max(MAX_TEAMS_MIN, n));
}

type GameDecider = "golden_point" | "star_point" | "advantage";

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultSchedule() {
  const starts = new Date();
  const ends = new Date(starts.getTime() + 8 * 60 * 60 * 1000);
  return { startsAt: toLocalDatetime(starts.toISOString()), endsAt: toLocalDatetime(ends.toISOString()) };
}

function formatLabel(format: TournamentFormat): string {
  return getTournamentFormatLabel(format);
}

function normalizeCategory(
  value: string | null | undefined,
): TournamentCategoryOption | "" {
  if (
    value &&
    TOURNAMENT_CATEGORY_OPTIONS.includes(value as TournamentCategoryOption)
  ) {
    return value as TournamentCategoryOption;
  }
  return "";
}

type PartnerTournamentWizardProps = {
  partnerSlug: string;
  sportSlug?: string;
  mode?: "create" | "edit";
  initial?: TournamentDetail | null;
  tournamentId?: string;
  /** Prefill when creating from a league detail page. */
  defaultPartnerLeagueId?: string | null;
  defaultPartnerLeagueName?: string | null;
};

type FormState = {
  name: string;
  description: string;
  categoryLabel: TournamentCategoryOption | "";
  venue: string;
  venueMapsUrl: string;
  courtCount: number;
  maxTeams: string;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string;
  status: "draft" | "upcoming" | "live" | "completed" | "cancelled";
  format: TournamentFormat;
  maxTeamsPerGroup: number;
  teamsAdvancePerGroup: number;
  bestRunnerUpSlots: number;
  maxRounds: number | null;
  playersPerTeam: 1 | 2;
  thirdPlaceEnabled: boolean;
  entryBilling: "paid" | "free";
  registrationFeeIdr: string;
  prizePoolIdr: string;
  partnerLeagueId: string | null;
  partnerLeagueName: string | null;
};

function formFromInitial(initial?: TournamentDetail | null): FormState {
  const schedule = defaultSchedule();
  if (!initial) {
    return {
      name: "",
      description: "",
      categoryLabel: "",
      venue: "",
      venueMapsUrl: "",
      courtCount: 2,
      maxTeams: "32",
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      registrationClosesAt: schedule.endsAt,
      status: "upcoming",
      format: "double_stage",
      maxTeamsPerGroup: 4,
      teamsAdvancePerGroup: 1,
      bestRunnerUpSlots: 0,
      maxRounds: 8,
      playersPerTeam: 2,
      thirdPlaceEnabled: false,
      entryBilling: "free",
      registrationFeeIdr: "",
      prizePoolIdr: "",
      partnerLeagueId: null,
      partnerLeagueName: null,
    };
  }

  const settings = parseTournamentSettings(initial.settings);
  const ds = parseDoubleStageSettings(initial.settings);
  const entryBilling: "paid" | "free" =
    initial.officialBilling === "paid" ||
    (initial.registrationFeeIdr != null && initial.registrationFeeIdr > 0)
      ? "paid"
      : "free";
  return {
    name: initial.name.slice(0, TOURNAMENT_FIELD_LIMITS.name),
    description: (initial.description ?? "").slice(0, TOURNAMENT_FIELD_LIMITS.description),
    categoryLabel: normalizeCategory(initial.categoryLabel),
    venue: (initial.venue ?? "").slice(0, TOURNAMENT_FIELD_LIMITS.venue),
    venueMapsUrl: settings.venueMapsUrl ?? "",
    courtCount: getTournamentCourtCount(initial),
    maxTeams: String(initial.maxTeams ?? 32),
    startsAt: toLocalDatetime(initial.startsAt) || schedule.startsAt,
    endsAt: toLocalDatetime(initial.endsAt) || schedule.endsAt,
    registrationClosesAt:
      toLocalDatetime(initial.registrationClosesAt) ||
      toLocalDatetime(initial.endsAt) ||
      schedule.endsAt,
    status:
      initial.status === "draft" ||
      initial.status === "upcoming" ||
      initial.status === "live" ||
      initial.status === "completed" ||
      initial.status === "cancelled"
        ? initial.status
        : "upcoming",
    format: (initial.format as TournamentFormat) || "double_stage",
    maxTeamsPerGroup: ds.maxTeamsPerGroup ?? 4,
    teamsAdvancePerGroup: ds.teamsAdvancePerGroup ?? 1,
    bestRunnerUpSlots: ds.bestRunnerUpSlots ?? 0,
    maxRounds: getMaxRounds(initial) ?? settings.maxRounds ?? null,
    playersPerTeam: initial.playersPerTeam === 1 ? 1 : 2,
    thirdPlaceEnabled: ds.thirdPlaceEnabled === true,
    entryBilling,
    registrationFeeIdr:
      entryBilling === "paid" && initial.registrationFeeIdr
        ? String(initial.registrationFeeIdr)
        : "",
    prizePoolIdr:
      initial.prizePoolIdr != null && initial.prizePoolIdr > 0
        ? String(initial.prizePoolIdr)
        : "",
    partnerLeagueId: initial.partnerLeagueId ?? null,
    partnerLeagueName: initial.partnerLeagueName ?? null,
  };
}

export function PartnerTournamentWizard({
  partnerSlug,
  sportSlug = "padel",
  mode = "create",
  initial = null,
  tournamentId,
  defaultPartnerLeagueId = null,
  defaultPartnerLeagueName = null,
}: PartnerTournamentWizardProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const isEdit = mode === "edit";
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [regCloseError, setRegCloseError] = useState<string | null>(null);
  const [maxTeamsError, setMaxTeamsError] = useState<string | null>(null);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [formatFamily, setFormatFamily] = useState<TournamentFormatFamily>(() =>
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
  const [bestieCupPreset, setBestieCupPreset] = useState(() => {
    if (!initial) return false;
    const raw = initial.settings as Record<string, unknown> | null | undefined;
    return raw?.poolRules === "bestie_cup" && initial.format === "double_stage";
  });
  const [form, setForm] = useState<FormState>(() => {
    const base = formFromInitial(initial);
    if (
      mode === "create" &&
      !base.partnerLeagueId &&
      defaultPartnerLeagueId?.trim()
    ) {
      return {
        ...base,
        partnerLeagueId: defaultPartnerLeagueId,
        partnerLeagueName: defaultPartnerLeagueName ?? null,
      };
    }
    return base;
  });
  const [cover, setCover] = useState<TournamentCoverValue>(() => ({
    previewUrl: initial?.coverImageUrl ?? null,
    storageKey: initial?.coverImageStorageKey ?? null,
    pendingFile: null,
    removed: false,
  }));

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;
  const isDoubleStage = form.format === "double_stage";
  const isAmericano = form.format === "americano";
  const isMexicanoLike = form.format === "mexicano";
  const isModifiedSwiss = form.format === "modified_swiss";
  const isGroupLike =
    form.format === "group_only" || form.format === "swiss" || isModifiedSwiss;
  const scheduleLocked =
    isEdit && (form.status === "live" || form.status === "completed");

  const handleFormatFamilyChange = (family: TournamentFormatFamily) => {
    setFormatFamily(family);
    if (form.format && !isFormatAllowedForFamily(family, form.format)) {
      patch("format", "double_stage");
      setMatchScoring((prev) => ensureDoubleStageScoringLeaves(prev));
    }
  };

  const meetingsSummary = (() => {
    if (formatFamily !== "custom" || !form.format) return undefined;
    const parts: string[] = [];
    if (formatHasGroupStage(form.format)) {
      parts.push(`${customMatch.groupMeetingsPerPair}× per pair in groups`);
    }
    if (formatHasKnockout(form.format)) {
      const legs = customMatch.knockoutLegsPerSlot;
      parts.push(`${legs} knockout leg${legs === 1 ? "" : "s"} per slot`);
    }
    return parts.length ? parts.join(" · ") : undefined;
  })();

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Keep registration deadline aligned when end moves and deadline was tied to old end.
      if (key === "endsAt" && typeof value === "string" && !scheduleLocked) {
        const prevEnd = prev.endsAt;
        if (!prev.registrationClosesAt || prev.registrationClosesAt === prevEnd) {
          next.registrationClosesAt = value;
        }
      }
      return next;
    });
  };

  const goToStep = (i: number) => {
    if (i === stepIndex) return;
    if (i < stepIndex) {
      setStepIndex(i);
      return;
    }
    // Validate each intermediate step before jumping forward.
    for (let s = stepIndex; s < i; s += 1) {
      if (!validateStep(s)) {
        setStepIndex(s);
        return;
      }
    }
    setStepIndex(i);
  };

  const validateStep = (index: number): boolean => {
    if (index === 0) {
      const name = form.name.trim();
      if (name.length < 3) {
        setNameError("Enter a name with at least 3 characters");
        toast.error("Enter a tournament name");
        return false;
      }
      if (name.length > TOURNAMENT_FIELD_LIMITS.name) {
        setNameError(`Name must be at most ${TOURNAMENT_FIELD_LIMITS.name} characters`);
        toast.error("Tournament name is too long");
        return false;
      }
      setNameError(null);

      if (!form.categoryLabel) {
        setCategoryError("Category is required (Male, Female, or Mix)");
        toast.error("Select a tournament category");
        return false;
      }
      setCategoryError(null);

      if (htmlCharCount(form.description) > TOURNAMENT_FIELD_LIMITS.description) {
        setDescriptionError(
          `Description must be at most ${TOURNAMENT_FIELD_LIMITS.description.toLocaleString()} characters`,
        );
        toast.error("Description is too long");
        return false;
      }
      setDescriptionError(null);

      const venue = form.venue.trim();
      if (venue.length < 2) {
        setVenueError("Venue is required");
        toast.error("Enter a venue for this tournament");
        return false;
      }
      if (venue.length > TOURNAMENT_FIELD_LIMITS.venue) {
        setVenueError(`Venue must be at most ${TOURNAMENT_FIELD_LIMITS.venue} characters`);
        toast.error("Venue is too long");
        return false;
      }
      setVenueError(null);

      const schedule = validatePartnerTournamentSchedule({
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        registrationClosesAt: form.registrationClosesAt,
      });
      if (!schedule.ok) {
        if (schedule.field === "registrationClosesAt") {
          setRegCloseError(schedule.message);
        } else {
          setRegCloseError(null);
        }
        toast.error(schedule.message);
        return false;
      }
      setRegCloseError(null);

      if (
        form.entryBilling === "paid" &&
        (!form.registrationFeeIdr || Number(form.registrationFeeIdr) <= 0)
      ) {
        setFeeError("Paid entry requires a fee (IDR)");
        toast.error("Enter an entry fee for paid registration");
        return false;
      }
      setFeeError(null);
    }
    if (index === 1) {
      if (!form.format) {
        toast.error("Choose a match format");
        return false;
      }
      if (!isFormatAllowedForFamily(formatFamily, form.format)) {
        toast.error(
          formatFamily === "custom"
            ? "Selected format is not available under Custom match"
            : "Selected format is not available under Original match",
        );
        return false;
      }

      const maxTeamsParsed = parseMaxTeamsInput(form.maxTeams);
      if (maxTeamsParsed == null) {
        setMaxTeamsError(`Enter max teams (${MAX_TEAMS_MIN}–${MAX_TEAMS_MAX})`);
        toast.error("Enter a valid max teams value");
        return false;
      }
      const maxTeamsClamped = clampMaxTeams(maxTeamsParsed);
      if (String(maxTeamsClamped) !== form.maxTeams) {
        patch("maxTeams", String(maxTeamsClamped));
      }
      if (maxTeamsParsed < MAX_TEAMS_MIN || maxTeamsParsed > MAX_TEAMS_MAX) {
        setMaxTeamsError(`Max teams must be between ${MAX_TEAMS_MIN} and ${MAX_TEAMS_MAX}`);
        toast.error(`Max teams must be between ${MAX_TEAMS_MIN} and ${MAX_TEAMS_MAX}`);
        return false;
      }
      setMaxTeamsError(null);

      if (isDoubleStage || isModifiedSwiss) {
        if (form.teamsAdvancePerGroup > form.maxTeamsPerGroup) {
          toast.error("Teams advancing per pool cannot exceed pairs per pool");
          return false;
        }
        if (maxTeamsClamped < form.maxTeamsPerGroup) {
          toast.error(
            `Max teams (${maxTeamsClamped}) is smaller than pairs per pool (${form.maxTeamsPerGroup}). Increase max teams or reduce pool size.`,
          );
          return false;
        }
      }

      if (isMexicanoLike && !mexicano.mode) {
        toast.error("Configure Mexicano mode and round count");
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(stepIndex)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const resolveCoverStorageKey = async (): Promise<string | undefined> => {
    if (cover.removed && !cover.pendingFile) return undefined;
    if (cover.pendingFile) {
      const uploaded = await uploadTournamentCoverClient(
        cover.pendingFile,
        sportSlug,
        tournamentId || undefined,
      );
      return uploaded.storageKey;
    }
    return cover.storageKey?.trim() || undefined;
  };

  const applyBestieCupPreset = () => {
    const defaults = bestieCupWizardDefaults();
    setFormatFamily(defaults.formatFamily);
    patch("format", defaults.format);
    patch("maxTeams", String(defaults.maxTeams));
    patch("maxTeamsPerGroup", defaults.maxTeamsPerGroup);
    patch("teamsAdvancePerGroup", defaults.teamsAdvancePerGroup);
    patch("bestRunnerUpSlots", defaults.bestRunnerUpSlots);
    patch("thirdPlaceEnabled", defaults.thirdPlaceEnabled);
    patch("courtCount", defaults.courtCount);
    setMatchScoring(defaultBestieCupDoubleStageMatchScoring());
    setBestieCupPreset(true);
    toast.success("Bestie Cup 2026 preset applied");
  };

  const buildPayload = (coverStorageKey?: string): Record<string, unknown> => {
    const startsAt = form.startsAt
      ? new Date(form.startsAt).toISOString()
      : new Date().toISOString();
    const endsAt = form.endsAt
      ? new Date(form.endsAt).toISOString()
      : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const descriptionHtml = form.description.trim();

    const scoringForPayload = matchScoringForFormat(
      form.format === "double_stage"
        ? ensureDoubleStageScoringLeaves(matchScoring)
        : matchScoring,
      form.format,
    );
    const groupResolved =
      resolveMatchScoringForStage(scoringForPayload, "group") ?? scoringForPayload;
    const knockoutResolved =
      resolveMatchScoringForStage(scoringForPayload, "knockout") ?? scoringForPayload;
    const rootMode = matchScoreModeFromScoring(groupResolved) ?? "points";
    const toLegacy = (n: number | undefined): RaceToGames | undefined =>
      n != null && RACE_TO_GAMES_OPTIONS.includes(n as RaceToGames)
        ? (n as RaceToGames)
        : undefined;
    const groupRace =
      groupResolved.mode === "race_to" ? groupResolved.raceTo?.value : undefined;
    const knockoutRace =
      knockoutResolved.mode === "race_to" ? knockoutResolved.raceTo?.value : undefined;
    const gameDecider: GameDecider | undefined =
      rootMode === "games" ? "golden_point" : undefined;

    return {
      name: form.name.trim().slice(0, TOURNAMENT_FIELD_LIMITS.name),
      description: descriptionHtml.slice(0, TOURNAMENT_FIELD_LIMITS.description),
      format: form.format,
      formatFamily,
      matchScoring: scoringForPayload,
      ...(formatFamily === "custom" ? { customMatch } : {}),
      categoryLabel: form.categoryLabel,
      tournamentType: "fun_match",
      officialBilling: form.entryBilling,
      registrationFeeIdr:
        form.entryBilling === "paid" ? Number(form.registrationFeeIdr) : 0,
      prizePoolIdr:
        form.prizePoolIdr.trim() && Number(form.prizePoolIdr) > 0
          ? Number(form.prizePoolIdr)
          : null,
      status: form.status,
      playersPerTeam: form.playersPerTeam,
      maxTeams: clampMaxTeams(parseMaxTeamsInput(form.maxTeams) ?? 32),
      venue: form.venue.trim().slice(0, TOURNAMENT_FIELD_LIMITS.venue),
      venueMapsUrl: form.venueMapsUrl.trim() || undefined,
      coverImageStorageKey: coverStorageKey,
      startsAt,
      endsAt,
      registrationClosesAt: form.registrationClosesAt
        ? new Date(form.registrationClosesAt).toISOString()
        : endsAt,
      matchScoreMode: rootMode,
      raceToGames: toLegacy(groupRace),
      raceToGamesGroup: isDoubleStage ? toLegacy(groupRace) : undefined,
      raceToGamesKnockout: isDoubleStage ? toLegacy(knockoutRace) : undefined,
      gameDecider,
      scoringType: "points",
      courtCount: form.courtCount,
      scoreEntryMode: initial ? getTournamentScoreEntryMode(initial) : "live",
      maxTeamsPerGroup:
        isDoubleStage || isGroupLike ? form.maxTeamsPerGroup : undefined,
      teamsAdvancePerGroup:
        isDoubleStage || isModifiedSwiss ? form.teamsAdvancePerGroup : undefined,
      bestRunnerUpSlots: isDoubleStage ? form.bestRunnerUpSlots : undefined,
      thirdPlaceEnabled:
        form.format === "double_stage" || form.format === "single_elimination"
          ? form.thirdPlaceEnabled
          : false,
      ...(isMexicanoLike
        ? { mexicano, maxRounds: mexicano.roundCount }
        : {}),
      ...(isAmericano ? { maxRounds: form.maxRounds ?? undefined } : {}),
      ...(bestieCupPreset || isModifiedSwiss ? { poolRules: "bestie_cup" as const } : {}),
      ...(bestieCupPreset || isModifiedSwiss || rootMode === "games"
        ? { matchFormat: "race_to_games" as const }
        : {}),
      partnerLeagueId: form.partnerLeagueId,
    };
  };

  const onSubmit = async () => {
    if (!validateStep(0)) {
      setStepIndex(0);
      return;
    }
    if (!validateStep(1)) {
      setStepIndex(1);
      return;
    }

    const ok = await confirm({
      title: isEdit ? "Save tournament changes?" : "Create this tournament?",
      description: isEdit
        ? "Updates apply on your partner site only — never on Gud Game rankings."
        : (
            <>
              Publish{" "}
              <span className="font-medium text-foreground">&ldquo;{form.name.trim()}&rdquo;</span>{" "}
              on your partner site.
            </>
          ),
      confirmLabel: isEdit ? "Save changes" : "Create tournament",
    });
    if (!ok) return;

    setPending(true);
    try {
      const coverKey = await resolveCoverStorageKey();
      const body = buildPayload(coverKey);
      const res = await fetch(
        isEdit && tournamentId
          ? `/api/partner/tournaments/${tournamentId}`
          : "/api/partner/tournaments",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await parseJsonResponse<{
        success: true;
        data: { slug: string; sportSlug?: string; id?: string };
      }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ??
            (isEdit ? "Save failed" : "Create failed"),
        );
      }

      toast.success(isEdit ? "Tournament updated" : "Tournament created");
      const slug = json.data.slug;
      // Land on the public event page (manage is available from the session chrome).
      router.push(partnerPublicRoutes.tournament(partnerSlug, slug));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  };

  const poolRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (isDoubleStage) {
      rows.push(
        { label: "Pairs per pool", value: String(form.maxTeamsPerGroup) },
        {
          label: "Advance",
          value: form.teamsAdvancePerGroup === 1 ? "1st only" : "1st & 2nd",
        },
        {
          label: "Best runner-ups",
          value: form.bestRunnerUpSlots === 0 ? "Off" : String(form.bestRunnerUpSlots),
        },
      );
    } else if (isModifiedSwiss) {
      rows.push(
        { label: "Pairs per pool", value: String(form.maxTeamsPerGroup) },
        {
          label: "Advance",
          value: form.teamsAdvancePerGroup === 1 ? "Pool winner" : `${form.teamsAdvancePerGroup} per pool`,
        },
        { label: "Meetings", value: "Once per pair (round robin)" },
        { label: "Pool scoring", value: "First to 6 · Golden Point · GW% tie-break" },
      );
    } else if (isGroupLike) {
      rows.push({ label: "Teams per group", value: String(form.maxTeamsPerGroup) });
    }
    return rows;
  }, [
    form.bestRunnerUpSlots,
    form.maxTeamsPerGroup,
    form.teamsAdvancePerGroup,
    isDoubleStage,
    isGroupLike,
    isModifiedSwiss,
  ]);

  const scoringRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [
      {
        label: "Match family",
        value: formatFamily === "custom" ? "Custom" : "Original",
      },
      { label: "Match scoring", value: summarizeMatchScoring(matchScoring) },
    ];
    if (meetingsSummary) {
      rows.push({ label: "Custom meetings", value: meetingsSummary });
    }
    if (isMexicanoLike) {
      rows.push({
        label: "Round mode",
        value: `${mexicano.mode === "individual" ? "Individual" : "Team"} · ${mexicano.roundCount} rounds`,
      });
    }
    if (isModifiedSwiss) {
      rows.push({
        label: "Side change / rest",
        value: "1 min at odd total games (from game 3)",
      });
    }
    if (isAmericano) {
      rows.push({
        label: "Max rounds",
        value: form.maxRounds != null ? String(form.maxRounds) : "Unlimited",
      });
    }
    rows.push({
      label: "Players / team",
      value: form.playersPerTeam === 1 ? "Singles (1)" : "Doubles (2)",
    });
    if (form.format === "double_stage" || form.format === "single_elimination") {
      rows.push({
        label: "3rd place match",
        value: form.thirdPlaceEnabled ? "Enabled" : "Off",
      });
    }
    return rows;
  }, [
    formatFamily,
    form.format,
    form.maxRounds,
    form.playersPerTeam,
    form.thirdPlaceEnabled,
    isAmericano,
    isMexicanoLike,
    isModifiedSwiss,
    matchScoring,
    meetingsSummary,
    mexicano.mode,
    mexicano.roundCount,
  ]);

  return (
    <div className={cn("relative space-y-6 py-8", partnerPageWidthClass)}>
      {pending ? (
        <PartnerLoadingOverlay
          show
          label={isEdit ? "Saving…" : "Creating tournament…"}
          variant="fullscreen"
        />
      ) : null}

      <PartnerPageHeader
        backHref={dashboardRoutes.partnerTournaments}
        backLabel="Tournaments"
        title={isEdit ? "Edit tournament" : "New tournament"}
        description="Official-style partner event — pick Original or Custom match formats, then configure pools and scoring. Data stays on your site, not Gud Game rankings."
      />

      {/* Match Official create wizard: focused max-w-4xl card under partner chrome */}
      <div className="mx-auto w-full max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
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
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {step.id === "basics" ? (
                <>
                  <TournamentWizardStepHeader
                    eyebrow="Step 1"
                    title="Event information"
                    description={`${isEdit ? "Update" : "Set"} the public name, schedule, category, entry fee, banner, description, and venue.`}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="partner-t-name">
                        Tournament name
                        <RequiredMark />
                      </Label>
                      <FieldCharCounter
                        current={form.name.length}
                        max={TOURNAMENT_FIELD_LIMITS.name}
                      />
                    </div>
                    <Input
                      id="partner-t-name"
                      value={form.name}
                      onChange={(e) => {
                        patch("name", e.target.value.slice(0, TOURNAMENT_FIELD_LIMITS.name));
                        if (nameError) setNameError(null);
                      }}
                      className="border-cp-border bg-cp-elevated/40"
                      placeholder="e.g. Friday Night Open"
                      maxLength={TOURNAMENT_FIELD_LIMITS.name}
                      aria-invalid={nameError ? true : undefined}
                      autoFocus={!isEdit}
                    />
                    <FieldError message={nameError} />
                  </div>

                  <CategorySelect
                    value={form.categoryLabel}
                    onChange={(v) => {
                      setCategoryError(null);
                      patch("categoryLabel", v);
                    }}
                    required
                    error={categoryError}
                    helperText="Required for listings and registration (Male, Female, or Mix)."
                  />

                  <PartnerTournamentLeagueField
                    value={form.partnerLeagueId}
                    onChange={(leagueId, leagueName) => {
                      setForm((prev) => ({
                        ...prev,
                        partnerLeagueId: leagueId,
                        partnerLeagueName: leagueName ?? null,
                      }));
                    }}
                    disabled={pending}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <DateTimePicker
                      label="Start date & time"
                      value={form.startsAt}
                      onChange={(v) => patch("startsAt", v)}
                    />
                    <DateTimePicker
                      label="End date & time"
                      value={form.endsAt}
                      onChange={(v) => patch("endsAt", v)}
                      min={form.startsAt}
                    />
                    <div className="sm:col-span-2 space-y-2">
                      <DateTimePicker
                        label="Registration closes"
                        value={form.registrationClosesAt}
                        onChange={(v) => {
                          setRegCloseError(null);
                          patch("registrationClosesAt", v);
                        }}
                        disabled={scheduleLocked}
                      />
                      <FieldError message={regCloseError} />
                      {scheduleLocked ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Registration deadline cannot be changed while the tournament is live or
                          completed.
                        </p>
                      ) : (
                        <p className="text-xs text-cp-muted">
                          Guests can register until this deadline — including after the tournament
                          has started. Must be on or before the end time.
                          {form.registrationClosesAt
                            ? ` Currently ${formatPartnerScheduleLabel(
                                new Date(form.registrationClosesAt).toISOString(),
                              )}.`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-cp-border/80 bg-cp-elevated/40 p-4">
                    <BillingTypeSelect
                      value={form.entryBilling}
                      onChange={(v) => {
                        setFeeError(null);
                        patch("entryBilling", v);
                        if (v === "free") patch("registrationFeeIdr", "");
                      }}
                      required
                      label="Entry fee"
                    />
                    {form.entryBilling === "paid" ? (
                      <div className="space-y-2">
                        <Label>
                          Entry fee (IDR)
                          <RequiredMark />
                        </Label>
                        <CurrencyInput
                          value={form.registrationFeeIdr}
                          onChange={(v) => {
                            setFeeError(null);
                            patch("registrationFeeIdr", v);
                          }}
                        />
                        <FieldError message={feeError} />
                        <p className="text-xs text-cp-muted">
                          Charged at guest registration via your partner payment gateway.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <TournamentCoverUpload value={cover} onChange={setCover} />
                  <p className="-mt-1 text-xs text-cp-muted">
                    Banner image on the public tournament page.
                  </p>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <p className="text-xs text-cp-muted">
                      Full overview in the About section — format notes, prizes, and house rules.
                    </p>
                    <RichTextEditor
                      value={form.description}
                      onChange={(html) => {
                        setDescriptionError(null);
                        patch("description", html.slice(0, TOURNAMENT_FIELD_LIMITS.description));
                      }}
                      placeholder="Overview, format notes, prizes, house rules…"
                      minHeight={160}
                      maxLength={TOURNAMENT_FIELD_LIMITS.description}
                    />
                    <FieldError message={descriptionError} />
                  </div>

                  <VenueAutocompleteField
                    venue={form.venue}
                    mapsUrl={form.venueMapsUrl}
                    onVenueChange={(venue) => {
                      setVenueError(null);
                      patch("venue", venue.slice(0, TOURNAMENT_FIELD_LIMITS.venue));
                    }}
                    onMapsUrlChange={(mapsUrl) => patch("venueMapsUrl", mapsUrl)}
                    required
                    fieldError={venueError}
                  />
                </>
              ) : null}

              {step.id === "format" ? (
                <>
                  <TournamentWizardStepHeader
                    eyebrow="Step 2"
                    title="Format & capacity"
                    description="Choose Original or Custom match family, pick the tournament structure, set courts and team capacity, then configure match scoring."
                  />
                  <FormatFamilySelect
                    value={formatFamily}
                    onChange={handleFormatFamilyChange}
                    required
                  />
                  <FormatTypeSelect
                    value={form.format}
                    onChange={(v) => {
                      patch("format", v);
                      if (v === "modified_swiss") {
                        patch("maxTeamsPerGroup", 3);
                        patch("teamsAdvancePerGroup", 1);
                        setCustomMatch((prev) => ({ ...prev, groupMeetingsPerPair: 1 }));
                      }
                      setMatchScoring((prev) => {
                        if (v === "double_stage") {
                          return ensureDoubleStageScoringLeaves(prev);
                        }
                        if (v === "modified_swiss") {
                          return defaultModifiedSwissMatchScoring();
                        }
                        return matchScoringForFormat(prev, v || "single_elimination");
                      });
                    }}
                    sportSlug={sportSlug}
                    partnerTenant
                    formatFamily={formatFamily}
                    required
                  />
                  {formatFamily === "custom" && form.format && form.format !== "modified_swiss" ? (
                    <CustomMeetingsFields
                      showGroupMeetings={formatHasGroupStage(form.format)}
                      showKnockoutLegs={formatHasKnockout(form.format)}
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
                  {isDoubleStage && formatFamily === "original" ? (
                    <div className="rounded-2xl border border-cp-primary/25 bg-gradient-to-br from-cp-primary/10 via-cp-elevated/40 to-cp-elevated/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            Bestie Cup 2026 preset
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                            {BESTIE_CUP_TOTAL_PAIRS} pairs · 16 pools × 3 · advance 1 · First to 6 ·
                            GW% tie-break · fixed R16 bracket (A–I … H–P) · no 3rd place · 5 courts
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={bestieCupPreset ? "secondary" : "default"}
                          size="sm"
                          className="shrink-0 rounded-full"
                          onClick={applyBestieCupPreset}
                        >
                          {bestieCupPreset ? "Preset applied" : "Apply preset"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {isMexicanoLike ? (
                    <MexicanoSettingsFields value={mexicano} onChange={setMexicano} />
                  ) : null}
                  {isModifiedSwiss ? (
                    <div className="space-y-4 rounded-2xl border border-cp-border/80 bg-cp-elevated/30 p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Modified Swiss pools</p>
                        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                          Round-robin within each pool — every pair meets once. Ranking: match wins →
                          game win % → draw. First to 6 games per match with Golden Point at deuce.
                          Side change and 1-minute rest when total games in a match is odd (from 3).
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Pairs per pool</Label>
                          <Select
                            value={String(form.maxTeamsPerGroup)}
                            onValueChange={(v) => patch("maxTeamsPerGroup", Number(v))}
                          >
                            <SelectTrigger className={cpSelectTriggerClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={cpSelectContentClass}>
                              {[3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                                  {n} pairs{n === 3 ? " (Bestie Cup default)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Advance per pool</Label>
                          <Select
                            value={String(form.teamsAdvancePerGroup)}
                            onValueChange={(v) => patch("teamsAdvancePerGroup", Number(v))}
                          >
                            <SelectTrigger className={cpSelectTriggerClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={cpSelectContentClass}>
                              <SelectItem value="1" className={cpSelectItemClass}>
                                Pool winner only
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {isAmericano ? (
                    <div className="space-y-2 sm:max-w-xs">
                      <Label>Number of session rounds</Label>
                      <Select
                        value={form.maxRounds == null ? "unlimited" : String(form.maxRounds)}
                        onValueChange={(v) =>
                          patch("maxRounds", v === "unlimited" ? null : Number(v))
                        }
                      >
                        <SelectTrigger className={cpSelectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={cpSelectContentClass}>
                          <SelectItem value="unlimited" className={cpSelectItemClass}>
                            Unlimited
                          </SelectItem>
                          {[4, 6, 8, 10, 12, 16].map((n) => (
                            <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                              {n} rounds
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <MatchScoringFields
                    value={matchScoring}
                    onChange={setMatchScoring}
                    showStageOverrides={form.format === "double_stage"}
                  />
                  <OfficialFormatSummary
                    formatFamily={formatFamily}
                    format={form.format}
                    rankingMode="open"
                    matchScoring={matchScoring}
                    customMatch={customMatch}
                    mexicano={isMexicanoLike ? mexicano : undefined}
                    modifiedSwiss={isModifiedSwiss}
                  />
                  <div className="grid gap-4 rounded-2xl border border-cp-border/80 bg-cp-elevated/30 p-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Courts</Label>
                      <Select
                        value={String(form.courtCount)}
                        onValueChange={(v) => patch("courtCount", Number(v))}
                      >
                        <SelectTrigger className={cpSelectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={cpSelectContentClass}>
                          {TOURNAMENT_COURT_COUNT_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                              {n} court{n === 1 ? "" : "s"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner-max-teams">
                        Max teams
                        <RequiredMark />
                      </Label>
                      <Input
                        id="partner-max-teams"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={MAX_TEAMS_MIN}
                        max={MAX_TEAMS_MAX}
                        value={form.maxTeams}
                        onChange={(e) => {
                          setMaxTeamsError(null);
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                          patch("maxTeams", digits);
                        }}
                        onBlur={() => {
                          const parsed = parseMaxTeamsInput(form.maxTeams);
                          if (parsed == null) {
                            patch("maxTeams", String(MAX_TEAMS_MIN));
                            return;
                          }
                          patch("maxTeams", String(clampMaxTeams(parsed)));
                        }}
                        className="border-cp-border bg-cp-elevated/40"
                        placeholder="32"
                        aria-invalid={maxTeamsError ? true : undefined}
                      />
                      <FieldError message={maxTeamsError} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Players per team</Label>
                      <Select
                        value={String(form.playersPerTeam)}
                        onValueChange={(v) =>
                          patch("playersPerTeam", Number(v) === 1 ? 1 : 2)
                        }
                      >
                        <SelectTrigger className={cpSelectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={cpSelectContentClass}>
                          <SelectItem value="2" className={cpSelectItemClass}>
                            Doubles (2 players)
                          </SelectItem>
                          <SelectItem value="1" className={cpSelectItemClass}>
                            Singles (1 player)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isDoubleStage ? (
                    <div className="space-y-4 rounded-2xl border border-cp-border/80 bg-cp-elevated/30 p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Pool configuration</p>
                        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                          Typical guidance for ≤32 pairs: 8 pools of 4 (winners to knockout).
                          Small fields: 3→1×3; 4–5→1 pool; 6→2×3. Day-1 RR order: L1vL2 &amp; L3vL4.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Pairs per pool</Label>
                          <Select
                            value={String(form.maxTeamsPerGroup)}
                            onValueChange={(v) => patch("maxTeamsPerGroup", Number(v))}
                          >
                            <SelectTrigger className={cpSelectTriggerClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={cpSelectContentClass}>
                              {[3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                                  {n} pairs{n === 4 ? " (recommended)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Advance per pool</Label>
                          <Select
                            value={String(form.teamsAdvancePerGroup)}
                            onValueChange={(v) => patch("teamsAdvancePerGroup", Number(v))}
                          >
                            <SelectTrigger className={cpSelectTriggerClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={cpSelectContentClass}>
                              <SelectItem value="1" className={cpSelectItemClass}>
                                1st only
                              </SelectItem>
                              <SelectItem value="2" className={cpSelectItemClass}>
                                1st &amp; 2nd
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Best runner-up slots</Label>
                        <Select
                          value={String(form.bestRunnerUpSlots)}
                          onValueChange={(v) => patch("bestRunnerUpSlots", Number(v))}
                        >
                          <SelectTrigger className={cpSelectTriggerClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={cpSelectContentClass}>
                            {[0, 1, 2, 4, 8].map((n) => (
                              <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                                {n === 0
                                  ? "Off"
                                  : `${n} cross-pool runner-up${n === 1 ? "" : "s"}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-cp-muted">
                          Fill remaining knockout slots from the best 2nds across all pools —
                          common for 12–20 pair amateur fields.
                        </p>
                      </div>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cp-border/70 bg-cp-card/40 px-3 py-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-cp-border"
                          checked={form.thirdPlaceEnabled}
                          onChange={(e) => patch("thirdPlaceEnabled", e.target.checked)}
                        />
                        <span>
                          <span className="block text-sm font-medium text-foreground">
                            Bronze / 3rd place match
                          </span>
                          <span className="mt-0.5 block text-xs text-cp-muted">
                            Add a consolation final for the losing semi-finalists after knockout is
                            generated.
                          </span>
                        </span>
                      </label>
                    </div>
                  ) : null}

                  {form.format === "single_elimination" ? (
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cp-border/80 bg-cp-elevated/30 px-4 py-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-cp-border"
                        checked={form.thirdPlaceEnabled}
                        onChange={(e) => patch("thirdPlaceEnabled", e.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          Bronze / 3rd place match
                        </span>
                        <span className="mt-0.5 block text-xs text-cp-muted">
                          Optional match for semi-final losers.
                        </span>
                      </span>
                    </label>
                  ) : null}

                  {isGroupLike && !isModifiedSwiss ? (
                    <div className="space-y-2 sm:max-w-xs">
                      <Label>Max teams per group</Label>
                      <Input
                        type="number"
                        min={2}
                        max={8}
                        value={form.maxTeamsPerGroup}
                        onChange={(e) =>
                          patch("maxTeamsPerGroup", Number(e.target.value) || 4)
                        }
                        className="border-cp-border bg-cp-elevated/40"
                      />
                    </div>
                  ) : null}
                </>
              ) : null}

              {step.id === "review" ? (
                <>
                  <TournamentWizardStepHeader
                    eyebrow="Step 3"
                    title="Review & publish"
                    description="Confirm settings. You can still edit later from Manage on your partner site."
                  />
                  <PartnerTournamentWizardReview
                    partnerSlug={partnerSlug}
                    name={form.name.trim()}
                    categoryLabel={form.categoryLabel}
                    seriesLabel={form.partnerLeagueName}
                    venue={form.venue}
                    venueMapsUrl={form.venueMapsUrl}
                    coverPreviewUrl={!cover.removed ? cover.previewUrl : null}
                    courtCount={String(form.courtCount)}
                    maxTeams={form.maxTeams}
                    startsAt={form.startsAt}
                    endsAt={form.endsAt}
                    registrationClosesAt={form.registrationClosesAt}
                    entryBilling={form.entryBilling}
                    registrationFeeIdr={form.registrationFeeIdr}
                    formatFamilyLabel={formatFamily === "custom" ? "Custom" : "Original"}
                    formatLabel={formatLabel(form.format)}
                    matchScoringLabel={summarizeMatchScoring(matchScoring)}
                    poolRows={poolRows}
                    scoringRows={scoringRows}
                    description={form.description}
                    isEdit={isEdit}
                    onEditStep={goToStep}
                  />
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <TournamentWizardFooter
          backHref={dashboardRoutes.partnerTournaments}
          backLabel="Back to list"
          showStepBack={stepIndex > 0}
          onStepBack={() => setStepIndex((i) => Math.max(0, i - 1))}
          isLast={isLast}
          onNext={goNext}
          onSubmit={() => void onSubmit()}
          isPending={pending}
          isEdit={isEdit}
        />
      </div>
      </div>
    </div>
  );
}
