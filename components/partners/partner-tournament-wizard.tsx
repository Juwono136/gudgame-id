"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
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
import { FormatTypeSelect } from "@/components/tournaments/form/format-type-select";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import { VenueAutocompleteField } from "@/components/tournaments/form/venue-autocomplete-field";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
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
import { parseDoubleStageSettings } from "@/lib/tournaments/scoring/config";
import { RACE_TO_GAMES_OPTIONS, type RaceToGames } from "@/lib/tournaments/scoring/game-mode";
import {
  TOURNAMENT_COURT_COUNT_OPTIONS,
  TOURNAMENT_ROUND_DURATION_OPTIONS,
  getTournamentCourtCount,
  getTournamentFormatLabel,
  getTournamentMatchFormat,
  getTournamentRaceToGamesForStage,
  getTournamentRoundDurationMinutes,
  getTournamentScoreEntryMode,
  getTournamentScoringType,
  parseTournamentSettings,
} from "@/lib/tournaments/settings";
import type { MatchFormat } from "@/lib/tournaments/scoring/classic-sets";
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
  { id: "basics", label: "Basics", shortLabel: "Basics" },
  { id: "format", label: "Format", shortLabel: "Format" },
  { id: "scoring", label: "Scoring", shortLabel: "Scoring" },
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
type ScoreEntryMode = "live" | "paper";
type ScoringType = "points" | "timed";

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

function raceToLabel(n: number): string {
  if (n === 2) return "First to 2 games";
  if (n === 3) return "First to 3 games";
  if (n === 4) return "First to 4 games (group favourite)";
  return "First to 6 games (knockout favourite)";
}

function formatLabel(format: TournamentFormat): string {
  if (format === "double_stage") return "Group stage + knockout";
  if (format === "single_elimination") return "Pure knockout";
  if (format === "americano") return "Americano";
  return getTournamentFormatLabel(format);
}

type PartnerTournamentWizardProps = {
  partnerSlug: string;
  sportSlug?: string;
  mode?: "create" | "edit";
  initial?: TournamentDetail | null;
  tournamentId?: string;
};

type FormState = {
  name: string;
  categoryLabel: TournamentCategoryOption;
  venue: string;
  venueMapsUrl: string;
  courtCount: number;
  maxTeams: string;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string;
  /** Preserved on edit so PATCH does not reset live/draft via schema defaults. */
  status: "draft" | "upcoming" | "live" | "completed" | "cancelled";
  format: TournamentFormat;
  maxTeamsPerGroup: number;
  teamsAdvancePerGroup: number;
  bestRunnerUpSlots: number;
  matchFormat: MatchFormat;
  raceToGamesGroup: RaceToGames;
  raceToGamesKnockout: RaceToGames;
  gameDecider: GameDecider;
  scoreEntryMode: ScoreEntryMode;
  scoringType: ScoringType;
  roundDurationMinutes: number;
  entryBilling: "paid" | "free";
  registrationFeeIdr: string;
};

function formFromInitial(initial?: TournamentDetail | null): FormState {
  const schedule = defaultSchedule();
  if (!initial) {
    return {
      name: "",
      categoryLabel: "Mix",
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
      matchFormat: "classic_sets",
      raceToGamesGroup: 4,
      raceToGamesKnockout: 6,
      gameDecider: "golden_point",
      scoreEntryMode: "live",
      scoringType: "points",
      roundDurationMinutes: 45,
      entryBilling: "free",
      registrationFeeIdr: "",
    };
  }

  const settings = parseTournamentSettings(initial.settings);
  const ds = parseDoubleStageSettings(initial.settings);
  const gameDecider =
    settings.gameDecider === "star_point" || settings.gameDecider === "advantage"
      ? settings.gameDecider
      : "golden_point";
  const entryBilling: "paid" | "free" =
    initial.officialBilling === "paid" ||
    (initial.registrationFeeIdr != null && initial.registrationFeeIdr > 0)
      ? "paid"
      : "free";
  return {
    name: initial.name,
    categoryLabel: (TOURNAMENT_CATEGORY_OPTIONS.includes(
      initial.categoryLabel as TournamentCategoryOption,
    )
      ? initial.categoryLabel
      : "Mix") as TournamentCategoryOption,
    venue: initial.venue ?? "",
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
    matchFormat: getTournamentMatchFormat(initial),
    raceToGamesGroup: getTournamentRaceToGamesForStage(initial, "group"),
    raceToGamesKnockout: getTournamentRaceToGamesForStage(initial, "knockout"),
    gameDecider,
    scoreEntryMode: getTournamentScoreEntryMode(initial),
    scoringType: getTournamentScoringType(initial),
    roundDurationMinutes: getTournamentRoundDurationMinutes(initial),
    entryBilling,
    registrationFeeIdr:
      entryBilling === "paid" && initial.registrationFeeIdr
        ? String(initial.registrationFeeIdr)
        : "",
  };
}

export function PartnerTournamentWizard({
  partnerSlug,
  sportSlug = "padel",
  mode = "create",
  initial = null,
  tournamentId,
}: PartnerTournamentWizardProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const isEdit = mode === "edit";
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [regCloseError, setRegCloseError] = useState<string | null>(null);
  const [maxTeamsError, setMaxTeamsError] = useState<string | null>(null);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => formFromInitial(initial));

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;
  const isDoubleStage = form.format === "double_stage";
  const isRace = form.matchFormat === "race_to_games";
  const scheduleLocked =
    isEdit && (form.status === "live" || form.status === "completed");

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

  const validateStep = (index: number): boolean => {
    if (index === 0) {
      if (form.name.trim().length < 3) {
        setNameError("Enter a name with at least 3 characters");
        toast.error("Enter a tournament name");
        return false;
      }
      setNameError(null);

      if (form.venue.trim().length < 2) {
        setVenueError("Venue is required");
        toast.error("Enter a venue for this tournament");
        return false;
      }
      setVenueError(null);

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
        toast.error("Choose a tournament format");
        return false;
      }
      if (form.format === "double_stage") {
        if (form.teamsAdvancePerGroup > form.maxTeamsPerGroup) {
          toast.error("Teams advancing per pool cannot exceed pairs per pool");
          return false;
        }
        const maxTeams = clampMaxTeams(parseMaxTeamsInput(form.maxTeams) ?? 32);
        if (maxTeams < form.maxTeamsPerGroup) {
          toast.error(
            `Max teams (${maxTeams}) is smaller than pairs per pool (${form.maxTeamsPerGroup}). Increase max teams or reduce pool size.`,
          );
          return false;
        }
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(stepIndex)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const buildPayload = (): Record<string, unknown> => {
    const startsAt = form.startsAt
      ? new Date(form.startsAt).toISOString()
      : new Date().toISOString();
    const endsAt = form.endsAt
      ? new Date(form.endsAt).toISOString()
      : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    return {
      name: form.name.trim(),
      format: form.format,
      categoryLabel: form.categoryLabel,
      tournamentType: "fun_match",
      officialBilling: form.entryBilling,
      registrationFeeIdr:
        form.entryBilling === "paid" ? Number(form.registrationFeeIdr) : 0,
      status: form.status,
      playersPerTeam: 2,
      maxTeams: clampMaxTeams(parseMaxTeamsInput(form.maxTeams) ?? 32),
      venue: form.venue.trim(),
      venueMapsUrl: form.venueMapsUrl.trim() || undefined,
      startsAt,
      endsAt,
      registrationClosesAt: form.registrationClosesAt
        ? new Date(form.registrationClosesAt).toISOString()
        : endsAt,
      matchScoreMode: "games",
      matchFormat: form.matchFormat,
      raceToGames: form.raceToGamesGroup,
      raceToGamesGroup: form.raceToGamesGroup,
      raceToGamesKnockout: isDoubleStage ? form.raceToGamesKnockout : form.raceToGamesGroup,
      gameDecider: form.gameDecider,
      scoringType: form.scoringType,
      roundDurationMinutes:
        form.scoringType === "timed" ? form.roundDurationMinutes : undefined,
      courtCount: form.courtCount,
      scoreEntryMode: form.scoreEntryMode,
      maxTeamsPerGroup: isDoubleStage ? form.maxTeamsPerGroup : undefined,
      teamsAdvancePerGroup: isDoubleStage ? form.teamsAdvancePerGroup : undefined,
      bestRunnerUpSlots: isDoubleStage ? form.bestRunnerUpSlots : undefined,
      thirdPlaceEnabled: false,
    };
  };

  const onSubmit = async () => {
    if (!validateStep(0) || !validateStep(1)) {
      setStepIndex(0);
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
              on your partner site. Results stay separate from Gud Game rankings.
            </>
          ),
      confirmLabel: isEdit ? "Save changes" : "Create tournament",
    });
    if (!ok) return;

    setPending(true);
    try {
      const body = buildPayload();
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
      router.push(partnerPublicRoutes.tournamentManage(partnerSlug, slug));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  };

  const reviewRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [
      { label: "Name", value: form.name.trim() || "—" },
      { label: "Category", value: form.categoryLabel },
      { label: "Format", value: formatLabel(form.format) },
      {
        label: "Match format",
        value:
          form.matchFormat === "classic_sets"
            ? "Classic sets (ITF / FIP)"
            : "Short race-to-N games",
      },
    ];
    if (isRace) {
      if (isDoubleStage) {
        rows.push(
          { label: "Group race-to", value: `First to ${form.raceToGamesGroup}` },
          { label: "Knockout race-to", value: `First to ${form.raceToGamesKnockout}` },
        );
      } else {
        rows.push({ label: "Race-to", value: `First to ${form.raceToGamesGroup}` });
      }
    }
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
    }
    rows.push(
      {
        label: "Game decider",
        value:
          form.gameDecider === "golden_point"
            ? "Golden Point (No-Ad)"
            : form.gameDecider === "star_point"
              ? "Star Point (FIP)"
              : "Advantage",
      },
      {
        label: "Score entry",
        value: form.scoreEntryMode === "live" ? "Live tablet" : "Paper / batch",
      },
      {
        label: "Time cap",
        value:
          form.scoringType === "timed"
            ? `${form.roundDurationMinutes} minutes`
            : "Untimed",
      },
      { label: "Courts", value: String(form.courtCount) },
      { label: "Max teams", value: form.maxTeams || "—" },
      {
        label: "Entry",
        value:
          form.entryBilling === "paid"
            ? `Paid · Rp ${Number(form.registrationFeeIdr || 0).toLocaleString("id-ID")}`
            : "Free",
      },
      {
        label: "Registration closes",
        value: formatPartnerScheduleLabel(
          form.registrationClosesAt
            ? new Date(form.registrationClosesAt).toISOString()
            : null,
        ),
      },
      { label: "Venue", value: form.venue.trim() || "—" },
    );
    return rows;
  }, [form, isDoubleStage, isRace]);

  return (
    <div className={cn("relative space-y-6 py-8", partnerPageWidthClass)}>
      {pending ? (
        <LoadingOverlay show label={isEdit ? "Saving…" : "Creating tournament…"} />
      ) : null}

      <PartnerPageHeader
        backHref={dashboardRoutes.partnerTournaments}
        backLabel="Tournaments"
        title={isEdit ? "Edit tournament" : "New tournament"}
        description="Partner white-label event — format, pools, and scoring stay on your site, never on Gud Game rankings. No skill tiers."
      />

      <WikiStepper
        steps={[...STEPS]}
        currentIndex={stepIndex}
        onStepClick={(i) => {
          if (i < stepIndex) setStepIndex(i);
          else if (i > stepIndex && validateStep(stepIndex)) setStepIndex(i);
        }}
        layout="segmented"
      />

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5 p-5 sm:p-6"
          >
            {step.id === "basics" ? (
              <>
                <TournamentWizardStepHeader
                  eyebrow="Step 1"
                  title="Basics & schedule"
                  description="Name your event, set capacity and courts, and choose when it runs."
                />
                <div className="space-y-2">
                  <Label htmlFor="partner-t-name">
                    Tournament name
                    <RequiredMark />
                  </Label>
                  <Input
                    id="partner-t-name"
                    value={form.name}
                    onChange={(e) => {
                      patch("name", e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    className="border-cp-border bg-cp-bg-input"
                    placeholder="e.g. Friday Night Open"
                    autoFocus
                  />
                  <FieldError message={nameError} />
                </div>

                <CategorySelect
                  value={form.categoryLabel}
                  onChange={(v) => patch("categoryLabel", v)}
                  required
                />
                <VenueAutocompleteField
                  venue={form.venue}
                  mapsUrl={form.venueMapsUrl}
                  onVenueChange={(venue) => {
                    setVenueError(null);
                    patch("venue", venue);
                  }}
                  onMapsUrlChange={(mapsUrl) => patch("venueMapsUrl", mapsUrl)}
                  required
                  fieldError={venueError}
                />
                <div className="grid gap-4 sm:grid-cols-2">
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
                      className="border-cp-border bg-cp-bg-input"
                      placeholder="32"
                    />
                    <FieldError message={maxTeamsError} />
                    <p className="text-xs text-cp-muted">
                      Capacity for guest registration ({MAX_TEAMS_MIN}–{MAX_TEAMS_MAX} teams).
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateTimePicker
                    label="Starts"
                    value={form.startsAt}
                    onChange={(v) => patch("startsAt", v)}
                  />
                  <DateTimePicker
                    label="Ends"
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
                    label="Entry: Free / Paid"
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
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {step.id === "format" ? (
              <>
                <TournamentWizardStepHeader
                  eyebrow="Step 2"
                  title="Tournament format"
                  description="Pick knockout, group stage + knockout, or Americano. Pool rules follow FIP-style guidance and stay editable."
                />
                <FormatTypeSelect
                  value={form.format}
                  onChange={(v) => patch("format", v)}
                  sportSlug={sportSlug}
                  partnerTenant
                  required
                />
                {isDoubleStage ? (
                  <div className="space-y-4 rounded-2xl border border-cp-border/80 bg-cp-elevated/30 p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Pool configuration</p>
                      <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                        FIP guidance for ≤32 pairs: typically 8 pools of 4 (winners to knockout).
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
                                {n} pairs{n === 4 ? " (FIP standard)" : ""}
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
                  </div>
                ) : null}
              </>
            ) : null}

            {step.id === "scoring" ? (
              <>
                <TournamentWizardStepHeader
                  eyebrow="Step 3"
                  title="Match scoring & operations"
                  description="Choose classic ITF/FIP sets or short race-to-N. For double stage you can set different race targets for groups vs knockout."
                />

                <div className="space-y-3">
                  <Label>Scoring system</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: "classic_sets" as const,
                          title: "Classic sets",
                          body: "ITF/FIP best of 3 — games to 6, TB at 6–6. Padel uses STB-10 when sets are 1–1.",
                        },
                        {
                          value: "race_to_games" as const,
                          title: "Short race-to-N",
                          body: "Community / time-capped. Ideal when group and knockout need different race targets.",
                        },
                      ] as const
                    ).map((opt) => {
                      const selected = form.matchFormat === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => patch("matchFormat", opt.value)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all",
                            selected
                              ? "border-cp-primary bg-cp-primary/10 ring-2 ring-cp-primary/25"
                              : "border-cp-border bg-cp-elevated/20 hover:bg-cp-elevated/40",
                          )}
                        >
                          <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-cp-muted">{opt.body}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isRace ? (
                  <div
                    className={cn(
                      "grid gap-4",
                      isDoubleStage ? "sm:grid-cols-2" : "sm:grid-cols-1",
                    )}
                  >
                    <div className="space-y-2">
                      <Label>{isDoubleStage ? "Group stage race-to" : "Race-to games"}</Label>
                      <Select
                        value={String(form.raceToGamesGroup)}
                        onValueChange={(v) =>
                          patch("raceToGamesGroup", Number(v) as RaceToGames)
                        }
                      >
                        <SelectTrigger className={cpSelectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={cpSelectContentClass}>
                          {RACE_TO_GAMES_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                              {raceToLabel(n)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isDoubleStage ? (
                      <div className="space-y-2">
                        <Label>Knockout race-to</Label>
                        <Select
                          value={String(form.raceToGamesKnockout)}
                          onValueChange={(v) =>
                            patch("raceToGamesKnockout", Number(v) as RaceToGames)
                          }
                        >
                          <SelectTrigger className={cpSelectTriggerClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={cpSelectContentClass}>
                            {RACE_TO_GAMES_OPTIONS.map((n) => (
                              <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                                {raceToLabel(n)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-cp-muted">
                          Example: groups race to 4, knockout race to 6.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-cp-border/70 bg-cp-elevated/30 px-4 py-3 text-xs leading-relaxed text-cp-muted">
                    Classic sets use best-of-3. Standings follow ITF hierarchy (wins → matches
                    played → H2H → set% → game%).
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Game decider (deuce)</Label>
                  <Select
                    value={form.gameDecider}
                    onValueChange={(v) => patch("gameDecider", v as GameDecider)}
                  >
                    <SelectTrigger className={cpSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={cpSelectContentClass}>
                      <SelectItem value="golden_point" className={cpSelectItemClass}>
                        Golden Point (No-Ad) — first deuce decides
                      </SelectItem>
                      <SelectItem value="star_point" className={cpSelectItemClass}>
                        Star Point (FIP 2026) — third deuce decides
                      </SelectItem>
                      <SelectItem value="advantage" className={cpSelectItemClass}>
                        Advantage — win by 2 (tennis-style)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-cp-muted">
                    Golden Point is recommended for community events. Star Point follows FIP
                    rules effective 1 Jan 2026.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Score entry</Label>
                    <Select
                      value={form.scoreEntryMode}
                      onValueChange={(v) => patch("scoreEntryMode", v as ScoreEntryMode)}
                    >
                      <SelectTrigger className={cpSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={cpSelectContentClass}>
                        <SelectItem value="live" className={cpSelectItemClass}>
                          Live tablet / courtside
                        </SelectItem>
                        <SelectItem value="paper" className={cpSelectItemClass}>
                          Paper / batch final scores
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-cp-muted">
                      Paper mode: enter results later — no live TV score updates during play.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Time cap</Label>
                    <Select
                      value={form.scoringType}
                      onValueChange={(v) => patch("scoringType", v as ScoringType)}
                    >
                      <SelectTrigger className={cpSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={cpSelectContentClass}>
                        <SelectItem value="points" className={cpSelectItemClass}>
                          Untimed
                        </SelectItem>
                        <SelectItem value="timed" className={cpSelectItemClass}>
                          Timed hard stop
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.scoringType === "timed" ? (
                  <div className="space-y-2">
                    <Label>Match / round duration</Label>
                    <Select
                      value={String(form.roundDurationMinutes)}
                      onValueChange={(v) => patch("roundDurationMinutes", Number(v))}
                    >
                      <SelectTrigger className={cpSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={cpSelectContentClass}>
                        {TOURNAMENT_ROUND_DURATION_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)} className={cpSelectItemClass}>
                            {n} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-cp-muted">
                      When time expires, the current score stands as the result.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            {step.id === "review" ? (
              <>
                <TournamentWizardStepHeader
                  eyebrow="Step 4"
                  title="Review & publish"
                  description="Confirm settings. You can still edit later from the partner dashboard."
                />
                <dl className="divide-y divide-cp-border overflow-hidden rounded-2xl border border-cp-border">
                  {reviewRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-cp-muted">
                        {row.label}
                      </dt>
                      <dd className="text-sm font-medium text-foreground sm:text-right">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs leading-relaxed text-cp-muted">
                  Isolation: stats, players, and eligibility stay on{" "}
                  <Link
                    href={partnerPublicRoutes.home(partnerSlug)}
                    className="font-medium text-cp-primary hover:underline"
                  >
                    /{partnerSlug}
                  </Link>{" "}
                  only — never mixed into Gud Game career rankings.
                </p>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

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
  );
}
