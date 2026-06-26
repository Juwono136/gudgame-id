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
import { CurrencyInput } from "@/components/tournaments/form/currency-input";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { TOURNAMENT_FIELD_LIMITS } from "@/lib/tournaments/form/field-limits";
import {
  TournamentCoverUpload,
  type TournamentCoverValue,
} from "@/components/tournaments/form/tournament-cover-upload";
import { revokeLocalPreviewUrl } from "@/lib/tournaments/cover-preview-url";
import { TournamentGearPicker } from "@/components/tournaments/form/tournament-gear-picker";
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
import { useCreateHostTournament } from "@/hooks/use-host-tournaments";
import { useUpdateManageTournament } from "@/hooks/use-manage-tournament";
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
  getTournamentRuleSections,
  getTournamentCourtCount,
  getTournamentFormatLabel,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
  getScoringTypeLabel,
  getVenueMapsUrl,
  type TournamentScoringType,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getSportTournamentDefaults } from "@/lib/tournaments/sport-config";
import {
  type TournamentStatus,
  type TournamentType,
} from "@/lib/domain/tournaments";
import type { TournamentUpsertInput } from "@/lib/validations/tournaments";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { cn } from "@/lib/utils";

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

const CATEGORY_OPTIONS = ["Male", "Female", "Mix"] as const;
const MATCH_TYPE_OPTIONS = [
  { value: "americano", label: "Americano" },
  { value: "single_elimination", label: "Elimination" },
] as const;

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
}: TournamentCreateWizardProps) {
  const isEdit = Boolean(initial && tournamentId);
  const adminCreate = useCreateTournament();
  const hostCreate = useCreateHostTournament();
  const adminUpdate = useUpdateAdminTournament(tournamentId ?? "");
  const hostUpdate = useUpdateManageTournament(tournamentId ?? "");
  const updateMutation = mode === "admin" ? adminUpdate : hostUpdate;
  const createMutation = mode === "host" ? hostCreate : adminCreate;
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const currentStepId = STEPS[stepIndex]?.id ?? "basics";

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TournamentStatus>(initial?.status ?? "upcoming");
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    initial?.tournamentType ?? initialTournamentType ?? "official",
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
  const [gearEntityIds, setGearEntityIds] = useState<string[]>(
    initialRules?.gearEntityIds ?? [],
  );
  const [startsAt, setStartsAt] = useState(toLocalDatetime(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalDatetime(initial?.endsAt));
  const [registrationFeeIdr, setRegistrationFeeIdr] = useState(
    initial?.registrationFeeIdr ? String(initial.registrationFeeIdr) : "",
  );
  const [prizePoolIdr, setPrizePoolIdr] = useState(
    initial?.prizePoolIdr ? String(initial.prizePoolIdr) : "",
  );
  const sportDefaults = getSportTournamentDefaults(sportSlug);
  const [maxTeams, setMaxTeams] = useState(
    String(initial?.maxTeams ?? sportDefaults.maxTeams),
  );
  const [playersPerTeam, setPlayersPerTeam] = useState(
    String(initial?.playersPerTeam ?? sportDefaults.playersPerTeam),
  );
  const [categoryLabel, setCategoryLabel] = useState(initial?.categoryLabel ?? "");
  const [registrationClosesAt, setRegistrationClosesAt] = useState(
    toLocalDatetime(initial?.registrationClosesAt),
  );
  const [matchType, setMatchType] = useState<TournamentUpsertInput["format"]>(
    initial?.format === "americano" ? "americano" : "single_elimination",
  );
  const [scoringType, setScoringType] = useState<TournamentScoringType>(
    initial ? getTournamentScoringType(initial) : "points",
  );
  const [pointsPerMatch, setPointsPerMatch] = useState(
    String(initial ? getTournamentPointsPerMatch(initial) : 21),
  );
  const [courtCount, setCourtCount] = useState(
    String(initial ? getTournamentCourtCount(initial) : 1),
  );

  useEffect(() => {
    if (!initial) return;
    setName(initial.name);
    setSlug(initial.slug);
    setSummary(initial.summary ?? "");
    setDescription(initial.description ?? "");
    setStatus(initial.status);
    setTournamentType(initial.tournamentType);
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
    setGearEntityIds(sections.gearEntityIds ?? []);
    setStartsAt(toLocalDatetime(initial.startsAt));
    setEndsAt(toLocalDatetime(initial.endsAt));
    setRegistrationFeeIdr(
      initial.registrationFeeIdr ? String(initial.registrationFeeIdr) : "",
    );
    setPrizePoolIdr(initial.prizePoolIdr ? String(initial.prizePoolIdr) : "");
    setMaxTeams(String(initial.maxTeams ?? sportDefaults.maxTeams));
    setPlayersPerTeam(String(initial.playersPerTeam ?? sportDefaults.playersPerTeam));
    setCategoryLabel(initial.categoryLabel ?? "");
    setRegistrationClosesAt(toLocalDatetime(initial.registrationClosesAt));
    setMatchType(initial.format === "americano" ? "americano" : "single_elimination");
    setScoringType(getTournamentScoringType(initial));
    setPointsPerMatch(String(getTournamentPointsPerMatch(initial)));
    setCourtCount(String(getTournamentCourtCount(initial)));
  }, [initial, sportDefaults.maxTeams, sportDefaults.playersPerTeam]);

  const resolvedSlug = slug.trim() || slugifyWikiName(name);

  const buildPayload = (coverStorageKey: string | undefined): TournamentUpsertInput => {
    const toIso = (local: string) => {
      if (!local.trim()) return "";
      const d = new Date(local);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    };
    return {
      name: name.trim(),
      slug: resolvedSlug,
      summary,
      description,
      status,
      tournamentType,
      format: matchType,
      rules: tournamentType === "recreational" ? rules : undefined,
      eligibilityRules: tournamentType === "official" ? "" : undefined,
      matchFormatRules: tournamentType === "official" ? matchFormatRules : rules,
      equipmentStandardsRules:
        tournamentType === "official" ? equipmentStandardsRules : undefined,
      gearEntityIds: tournamentType === "official" ? gearEntityIds : undefined,
      venue,
      venueMapsUrl: venueMapsUrl.trim() || undefined,
      coverImageStorageKey: coverStorageKey,
      maxTeams: maxTeams ? Number(maxTeams) : undefined,
      playersPerTeam: Number(playersPerTeam) || 2,
      registrationFeeIdr:
        tournamentType === "official" && registrationFeeIdr
          ? Number(registrationFeeIdr)
          : undefined,
      prizePoolIdr: prizePoolIdr ? Number(prizePoolIdr) : undefined,
      categoryLabel,
      registrationClosesAt: toIso(registrationClosesAt),
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
      scoringType,
      pointsPerMatch: Number(pointsPerMatch) || 21,
      courtCount: Number(courtCount) || 1,
    };
  };

  const validateStepById = (stepId: StepId): boolean => {
    const limitError = (field: string, max: number) => {
      toast.error(`${field} must be at most ${max.toLocaleString()} characters`);
    };

    if (stepId === "basics") {
      if (!name.trim()) {
        toast.error("Tournament name is required");
        return false;
      }
      if (name.length > TOURNAMENT_FIELD_LIMITS.name) {
        limitError("Name", TOURNAMENT_FIELD_LIMITS.name);
        return false;
      }
      if (categoryLabel.length > TOURNAMENT_FIELD_LIMITS.categoryLabel) {
        limitError("Category label", TOURNAMENT_FIELD_LIMITS.categoryLabel);
        return false;
      }
      if (!CATEGORY_OPTIONS.includes(categoryLabel as (typeof CATEGORY_OPTIONS)[number])) {
        toast.error("Choose a category: Male, Female, or Mix");
        return false;
      }
      if (matchType !== "americano" && matchType !== "single_elimination") {
        toast.error("Choose a match type");
        return false;
      }
      if (![11, 15, 21, 25, 30].includes(Number(pointsPerMatch))) {
        toast.error("Choose a supported point per match value");
        return false;
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
      if (
        tournamentType === "official" &&
        (!registrationFeeIdr || Number(registrationFeeIdr) <= 0)
      ) {
        toast.error("Official tournaments require a registration fee (IDR)");
        return false;
      }
    }
    if (stepId === "schedule") {
      if (venue.length > TOURNAMENT_FIELD_LIMITS.venue) {
        limitError("Venue", TOURNAMENT_FIELD_LIMITS.venue);
        return false;
      }
      if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
        toast.error("End date must be after start date");
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
        sportSlug,
        tournamentId,
      );
      return uploaded.storageKey;
    }
    return cover.storageKey?.trim() || undefined;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const coverKey = await resolveCoverStorageKey();
      const payload = buildPayload(coverKey);

      if (isEdit) {
        updateMutation.mutate(payload, {
          onSuccess: () => {
            if (mode === "admin") {
              router.push(adminRoutes.wikiEntities);
            } else {
              router.push(tournamentAfterSaveUrl(workspace, tournamentId));
            }
          },
        });
        return;
      }
      createMutation.mutate(payload, {
        onSuccess: (tournament) => {
          if (mode === "host") {
            router.push(tournamentAfterCreateUrl("host", tournament));
          }
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Banner upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isPending =
    submitting || (isEdit ? updateMutation.isPending : createMutation.isPending);
  const isLast = stepIndex >= STEPS.length - 1;
  const shouldShowTopBack =
    showTopBack ?? (!onBack && (mode === "host" || workspace === "host"));

  return (
    <div className="mx-auto w-full max-w-4xl">
      {shouldShowTopBack ? (
        <Link
          href={listBackHref}
          className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {listBackLabel}
        </Link>
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
                    description={`${isEdit ? "Update" : "Create"} a tournament for ${sportSlug}. Set the name, fees, capacity, and public description.`}
                  />
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="t-name">Name</Label>
                    <FieldCharCounter current={name.length} max={TOURNAMENT_FIELD_LIMITS.name} />
                  </div>
                  <Input
                    id="t-name"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, TOURNAMENT_FIELD_LIMITS.name))}
                    placeholder="Premier Padel Open 2026"
                    maxLength={TOURNAMENT_FIELD_LIMITS.name}
                    className="border-cp-border bg-cp-elevated"
                  />
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
                    <div className="space-y-2">
                      <Label>Registration fee (IDR) *</Label>
                      <CurrencyInput
                        value={registrationFeeIdr}
                        onChange={setRegistrationFeeIdr}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prize pool (IDR)</Label>
                      <CurrencyInput value={prizePoolIdr} onChange={setPrizePoolIdr} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Category</Label>
                      <Select value={categoryLabel} onValueChange={setCategoryLabel}>
                        <SelectTrigger className="border-cp-border bg-cp-elevated">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label>Match type</Label>
                  <Select
                    value={matchType}
                    onValueChange={(v) => setMatchType(v as TournamentUpsertInput["format"])}
                  >
                    <SelectTrigger className="border-cp-border bg-cp-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                </div>
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
                  </div>
                </>
              ) : null}

              {currentStepId === "schedule" ? (
                <>
                  <TournamentWizardStepHeader
                    eyebrow="Step 2"
                    title="Schedule & rules"
                    description="Set dates, venue, and official rules players must follow."
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

              <VenueAutocompleteField
                venue={venue}
                mapsUrl={venueMapsUrl}
                onVenueChange={(v) => setVenue(v.slice(0, TOURNAMENT_FIELD_LIMITS.venue))}
                onMapsUrlChange={setVenueMapsUrl}
              />

              {tournamentType === "official" ? (
                <div className="space-y-6">
                  <div>
                    <Label>Match format</Label>
                    <p className="mb-2 text-xs text-cp-muted">
                      Scoring, sets, tie-breaks, scheduling, and match flow.
                    </p>
                    <RichTextEditor
                      value={matchFormatRules}
                      onChange={setMatchFormatRules}
                      placeholder="Match format and scoring rules…"
                      minHeight={160}
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
                  <TournamentGearPicker
                    sportSlug={sportSlug}
                    selectedIds={gearEntityIds}
                    onChange={setGearEntityIds}
                  />
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
              sportSlug={sportSlug}
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
              gearCount={gearEntityIds.length}
              matchTypeLabel={getTournamentFormatLabel(matchType)}
              scoringTypeLabel={getScoringTypeLabel(scoringType)}
              pointsPerMatch={pointsPerMatch}
              courtCount={courtCount}
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
        />
      </div>
    </div>
  );
}
