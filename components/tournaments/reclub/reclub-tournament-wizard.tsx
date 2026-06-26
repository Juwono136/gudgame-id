"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Gamepad2,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { ReclubWizardReview } from "@/components/tournaments/reclub/reclub-wizard-review";
import { ReclubWizardStepper } from "@/components/tournaments/reclub/reclub-wizard-stepper";
import { TournamentCoverUpload, type TournamentCoverValue } from "@/components/tournaments/form/tournament-cover-upload";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { TOURNAMENT_FIELD_LIMITS } from "@/lib/tournaments/form/field-limits";
import {
  localDatetimeToIso,
  toLocalDatetime,
} from "@/lib/tournaments/form/datetime-local";
import {
  validateReclubWizardAll,
  validateReclubWizardStep,
  type ReclubWizardFormState,
} from "@/lib/tournaments/form/reclub-wizard-validation";
import { revokeLocalPreviewUrl } from "@/lib/tournaments/cover-preview-url";
import { VenueAutocompleteField } from "@/components/tournaments/form/venue-autocomplete-field";
import { uploadTournamentCoverClient } from "@/lib/tournaments/upload-cover-client";
import { Button } from "@/components/ui/button";
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
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import {
  useCreatePlayerReclubTournament,
  useUpdateHostTournament,
} from "@/hooks/use-host-tournaments";
import { useCreateTournament, useUpdateAdminTournament } from "@/hooks/use-tournaments";
import { useUpdateManageTournament } from "@/hooks/use-manage-tournament";
import { dashboardRoutes, adminRoutes } from "@/lib/constants/routes";
import { tournamentAfterCreateUrl, tournamentAfterSaveUrl } from "@/lib/tournaments/edit-routes";
import { getMaxRounds, getVenueMapsUrl } from "@/lib/tournaments/settings";
import {
  TOURNAMENT_COURT_COUNT_OPTIONS,
  TOURNAMENT_POINTS_PER_MATCH_OPTIONS,
  getTournamentCourtCount,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
  type TournamentScoringType,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentStatus } from "@/lib/domain/tournaments";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { getSportTournamentDefaults } from "@/lib/tournaments/sport-config";

const STEPS = [
  { id: "basics", label: "Basics", shortLabel: "Basics", icon: Gamepad2 },
  { id: "schedule", label: "Schedule & teams", shortLabel: "Schedule", icon: CalendarDays },
  { id: "details", label: "Details", shortLabel: "Details", icon: Users },
  { id: "review", label: "Review", shortLabel: "Review", icon: MapPin },
] as const;

type SportOption = { slug: string; name: string };

export type ReclubTournamentWizardProps = {
  sports: SportOption[];
  defaultSportSlug?: string;
  /** Edit mode — existing tournament */
  initial?: TournamentDetail;
  tournamentId?: string;
  workspace?: "host" | "player" | "admin";
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
};

function buildInitialCover(initial?: TournamentDetail): TournamentCoverValue {
  if (!initial) {
    return { previewUrl: null, storageKey: null, pendingFile: null, removed: false };
  }
  return {
    previewUrl: initial.coverImageUrl,
    storageKey: initial.coverImageStorageKey,
    pendingFile: null,
    removed: false,
  };
}

function hydrateFromInitial(initial: TournamentDetail) {
  const maxRounds = getMaxRounds(initial);
  return {
    sportSlug: initial.sportSlug,
    name: initial.name,
    summary: initial.summary ?? "",
    description: initial.description ?? "",
    rules: initial.rules ?? "",
    venue: initial.venue ?? "",
    venueMapsUrl: getVenueMapsUrl(initial) ?? "",
    playersPerTeam: String(initial.playersPerTeam),
    maxTeams: String(initial.maxTeams ?? 8),
    maxRounds: String(maxRounds ?? 3),
    matchType: initial.format === "americano" ? "americano" : "single_elimination",
    scoringType: getTournamentScoringType(initial),
    pointsPerMatch: String(getTournamentPointsPerMatch(initial)),
    courtCount: String(getTournamentCourtCount(initial)),
    startsAt: toLocalDatetime(initial.startsAt),
    endsAt: toLocalDatetime(initial.endsAt),
  };
}

export function ReclubTournamentWizard({
  sports,
  defaultSportSlug = "padel",
  initial,
  tournamentId,
  workspace = "player",
  backHref,
  backLabel,
  onBack,
}: ReclubTournamentWizardProps) {
  const isEdit = Boolean(initial && tournamentId);
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const playerReclubCreate = useCreatePlayerReclubTournament();
  const adminReclubCreate = useCreateTournament();
  const hostUpdate = useUpdateHostTournament(tournamentId ?? "");
  const playerUpdate = useUpdateManageTournament(tournamentId ?? "");
  const adminUpdate = useUpdateAdminTournament(tournamentId ?? "");
  const createMutation =
    workspace === "admin" ? adminReclubCreate : playerReclubCreate;
  const updateMutation =
    workspace === "admin"
      ? adminUpdate
      : workspace === "host"
        ? hostUpdate
        : playerUpdate;
  const isPending = isEdit ? updateMutation.isPending : createMutation.isPending;

  const hydrated = initial ? hydrateFromInitial(initial) : null;

  const [step, setStep] = useState(0);
  const [sportSlug, setSportSlug] = useState(hydrated?.sportSlug ?? defaultSportSlug);
  const [name, setName] = useState(hydrated?.name ?? "");
  const [summary, setSummary] = useState(hydrated?.summary ?? "");
  const [description, setDescription] = useState(hydrated?.description ?? "");
  const [rules, setRules] = useState(hydrated?.rules ?? "");
  const [venue, setVenue] = useState(hydrated?.venue ?? "");
  const [venueMapsUrl, setVenueMapsUrl] = useState(hydrated?.venueMapsUrl ?? "");
  const [cover, setCover] = useState<TournamentCoverValue>(() => buildInitialCover(initial));

  const defaults = getSportTournamentDefaults(sportSlug);
  const [playersPerTeam, setPlayersPerTeam] = useState(
    hydrated?.playersPerTeam ?? String(defaults.playersPerTeam),
  );
  const [maxTeams, setMaxTeams] = useState(
    hydrated?.maxTeams ?? String(Math.min(defaults.maxTeams, 16)),
  );
  const [maxRounds, setMaxRounds] = useState(hydrated?.maxRounds ?? "3");
  const [matchType, setMatchType] = useState(
    hydrated?.matchType ?? "americano",
  );
  const [scoringType, setScoringType] = useState<TournamentScoringType>(
    hydrated?.scoringType ?? "points",
  );
  const [pointsPerMatch, setPointsPerMatch] = useState(
    hydrated?.pointsPerMatch ?? "21",
  );
  const [courtCount, setCourtCount] = useState(hydrated?.courtCount ?? "1");
  const [startsAt, setStartsAt] = useState(hydrated?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(hydrated?.endsAt ?? "");

  const coverPreviewRef = useRef(cover.previewUrl);
  coverPreviewRef.current = cover.previewUrl;

  useEffect(() => {
    return () => revokeLocalPreviewUrl(coverPreviewRef.current);
  }, []);

  const slug = useMemo(
    () => (isEdit && initial ? initial.slug : slugifyWikiName(name || "fun-match")),
    [isEdit, initial, name],
  );

  const sportName =
    sports.find((s) => s.slug === sportSlug)?.name ??
    initial?.sportName ??
    sportSlug;

  const formState: ReclubWizardFormState = {
    name,
    summary,
    description,
    rules,
    venue,
    venueMapsUrl,
    playersPerTeam,
    maxTeams,
    maxRounds,
    matchType,
    scoringType,
    pointsPerMatch,
    courtCount,
    startsAt,
    endsAt,
  };

  const resolvedBackHref =
    backHref ??
    (workspace === "admin"
      ? adminRoutes.wikiEntities
      : workspace === "host"
        ? dashboardRoutes.hostTournaments
        : dashboardRoutes.tournaments);
  const resolvedBackLabel =
    backLabel ??
    (workspace === "admin"
      ? "Wiki database"
      : workspace === "host"
        ? "My tournaments"
        : "Tournament history");

  const goNext = () => {
    const err = validateReclubWizardStep(step, formState);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goToStep = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= STEPS.length || isPending) return;
    if (targetIndex === step) return;

    if (targetIndex < step) {
      setStep(targetIndex);
      return;
    }

    for (let i = step; i < targetIndex; i++) {
      const err = validateReclubWizardStep(i, formState);
      if (err) {
        toast.error(err);
        setStep(i);
        return;
      }
    }
    setStep(targetIndex);
  };

  const buildPayload = async () => {
    let coverKey: string | undefined;
    if (cover.removed && !cover.pendingFile) {
      coverKey = undefined;
    } else if (cover.pendingFile) {
      const uploaded = await uploadTournamentCoverClient(
        cover.pendingFile,
        sportSlug,
        tournamentId,
      );
      coverKey = uploaded.storageKey;
    } else if (cover.storageKey) {
      coverKey = cover.storageKey;
    }

    return {
      name: name.trim(),
      slug: isEdit ? undefined : slug,
      summary: summary.trim() || undefined,
      description: description.trim() || undefined,
      rules: rules.trim() || undefined,
      venue: venue.trim() || undefined,
      venueMapsUrl: venueMapsUrl.trim() || undefined,
      coverImageStorageKey: coverKey,
      tournamentType: "recreational" as const,
      status: (isEdit ? initial?.status : "upcoming") as TournamentStatus,
      playersPerTeam: Number(playersPerTeam) || 2,
      maxTeams: Number(maxTeams) || 8,
      maxRounds: Number(maxRounds) || 3,
      startsAt: localDatetimeToIso(startsAt),
      endsAt: localDatetimeToIso(endsAt),
      format: matchType as "americano" | "single_elimination",
      scoringType,
      pointsPerMatch: Number(pointsPerMatch) || 21,
      courtCount: Number(courtCount) || 1,
    };
  };

  const handleSubmit = async () => {
    const err = validateReclubWizardAll(formState);
    if (err) {
      toast.error(err);
      return;
    }

    const ok = await confirm({
      title: isEdit ? "Save Fun Match changes?" : "Create Fun Match?",
      description: isEdit
        ? "Updates will appear on the public session page immediately."
        : "This is a free community session. It won't affect official rankings.",
      confirmLabel: isEdit ? "Save changes" : "Create",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    try {
      const payload = await buildPayload();

      if (isEdit && tournamentId) {
        updateMutation.mutate(payload, {
          onSuccess: () => {
            if (workspace === "admin") {
              router.push(adminRoutes.wikiEntities);
              return;
            }
            if (isEdit && tournamentId) {
              router.push(tournamentAfterCreateUrl(workspace, { id: tournamentId, sportSlug, slug }));
            } else {
              router.push(tournamentAfterSaveUrl(workspace));
            }
          },
        });
      } else if (workspace === "admin") {
        adminReclubCreate.mutate(payload, {
          onSuccess: () => {
            router.push(adminRoutes.wikiEntities);
          },
        });
      } else {
        playerReclubCreate.mutate(
          { sportSlug, ...payload },
          {
            onSuccess: (tournament) => {
              router.push(tournamentAfterCreateUrl(workspace, tournament));
            },
          },
        );
      }
    } catch (uploadErr) {
      toast.error(uploadErr instanceof Error ? uploadErr.message : "Cover upload failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <LoadingOverlay
        show={isPending}
      label={isEdit ? "Saving changes…" : "Creating session…"}
      />

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {resolvedBackLabel}
        </button>
      ) : (
        <Link
          href={resolvedBackHref}
          className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {resolvedBackLabel}
        </Link>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-950/30 via-cp-card to-cp-bg p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
            <Gamepad2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEdit ? "Edit Fun Match" : "Create Fun Match"}
            </h1>
            <p className="mt-1 text-sm text-cp-muted">
              Free community play — no official ranking impact. Open to all members.
            </p>
          </div>
        </div>

        <div className="mt-8 w-full">
          <ReclubWizardStepper
            steps={[...STEPS]}
            currentIndex={step}
            onStepClick={goToStep}
            disabled={isPending}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="mt-6 rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-8"
        >
          {step === 0 ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Sport</Label>
                  {isEdit || workspace === "admin" ? (
                    <p className="mt-1.5 rounded-lg border border-cp-border bg-cp-elevated/30 px-3 py-2.5 text-sm capitalize text-foreground">
                      {sportName}
                    </p>
                  ) : (
                    <Select value={sportSlug} onValueChange={setSportSlug}>
                      <SelectTrigger className="mt-1.5 border-cp-border bg-cp-bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sports.map((s) => (
                          <SelectItem key={s.slug} value={s.slug}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="reclub-name">Fun Match name *</Label>
                  <Input
                    id="reclub-name"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, TOURNAMENT_FIELD_LIMITS.name))}
                    placeholder="Friday night sparring"
                    maxLength={TOURNAMENT_FIELD_LIMITS.name}
                    className="mt-1.5 border-cp-border bg-cp-bg-input"
                  />
                  <FieldCharCounter
                    current={name.length}
                    max={TOURNAMENT_FIELD_LIMITS.name}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-cp-muted">
                    URL: /sports/{sportSlug}/tournaments/{slug}
                  </p>
                </div>
              </div>

              <div>
                <Label>Short summary</Label>
                <p className="mb-2 text-xs text-cp-muted">
                  Rich text — shown on the tournament card and header.
                </p>
                <RichTextEditor
                  value={summary}
                  onChange={setSummary}
                  placeholder="What is this session about?"
                  minHeight={120}
                  maxLength={TOURNAMENT_FIELD_LIMITS.summary}
                />
              </div>

              <TournamentCoverUpload value={cover} onChange={setCover} />

              <VenueAutocompleteField
                venue={venue}
                mapsUrl={venueMapsUrl}
                onVenueChange={(v) => setVenue(v.slice(0, TOURNAMENT_FIELD_LIMITS.venue))}
                onMapsUrlChange={(v) => setVenueMapsUrl(v.slice(0, 2000))}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Players per team</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={playersPerTeam}
                    onChange={(e) => setPlayersPerTeam(e.target.value)}
                    className="mt-1.5 border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div>
                  <Label>Max teams / squads</Label>
                  <Input
                    type="number"
                    min={2}
                    max={64}
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(e.target.value)}
                    className="mt-1.5 border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Number of rounds</Label>
                  <p className="mb-1.5 text-xs text-cp-muted">
                    {isEdit
                      ? "Set at creation — cannot be changed after players join."
                      : "How many matches can be played in this session."}
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={maxRounds}
                    onChange={(e) => !isEdit && setMaxRounds(e.target.value)}
                    readOnly={isEdit}
                    disabled={isEdit}
                    className="mt-1.5 max-w-[120px] border-cp-border bg-cp-bg-input disabled:opacity-70"
                  />
                </div>
                <div>
                  <Label>Match type</Label>
                  <Select value={matchType} onValueChange={setMatchType}>
                    <SelectTrigger className="mt-1.5 border-cp-border bg-cp-bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="americano">Americano</SelectItem>
                      <SelectItem value="single_elimination">Elimination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scoring type</Label>
                  <Select
                    value={scoringType}
                    onValueChange={(v) => setScoringType(v as TournamentScoringType)}
                  >
                    <SelectTrigger className="mt-1.5 border-cp-border bg-cp-bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="timed">Timed rounds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Point per match</Label>
                  <Select value={pointsPerMatch} onValueChange={setPointsPerMatch}>
                    <SelectTrigger className="mt-1.5 border-cp-border bg-cp-bg-input">
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
                <div>
                  <Label>Number of courts</Label>
                  <Select value={courtCount} onValueChange={setCourtCount}>
                    <SelectTrigger className="mt-1.5 border-cp-border bg-cp-bg-input">
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
              </div>
              <DateTimePicker label="Starts at *" value={startsAt} onChange={setStartsAt} />
              <p className="text-xs text-cp-muted">
                Session status becomes <span className="text-foreground">live</span> at start time
                and <span className="text-foreground">ended</span> after the end time — players
                cannot join or play once the session has ended.
              </p>
              <DateTimePicker
                label="Ends at *"
                value={endsAt}
                onChange={setEndsAt}
                min={startsAt}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div>
                <Label>Full description</Label>
                <p className="mb-2 text-xs text-cp-muted">
                  Detailed info for the tournament overview tab.
                </p>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Format, skill level, what to bring…"
                  minHeight={160}
                  maxLength={TOURNAMENT_FIELD_LIMITS.description}
                />
              </div>
              <div>
                <Label>House rules (optional)</Label>
                <RichTextEditor
                  value={rules}
                  onChange={setRules}
                  placeholder="Scoring, rotation, fair play…"
                  minHeight={120}
                  maxLength={TOURNAMENT_FIELD_LIMITS.rules}
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <ReclubWizardReview
              sportName={sportName}
              name={name.trim() || "—"}
              slug={slug}
              sportSlug={sportSlug}
              venue={venue}
              venueMapsUrl={venueMapsUrl}
              coverPreviewUrl={cover.previewUrl}
              showCover={!cover.removed && Boolean(cover.previewUrl)}
              playersPerTeam={playersPerTeam}
              maxTeams={maxTeams}
              maxRounds={maxRounds}
              matchType={matchType}
              scoringType={scoringType}
              pointsPerMatch={pointsPerMatch}
              courtCount={courtCount}
              startsAt={startsAt}
              endsAt={endsAt}
              summary={summary}
              description={description}
              rules={rules}
              isEdit={isEdit}
              onEditStep={goToStep}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          className="border-cp-border"
          disabled={step === 0 || isPending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={goNext} disabled={isPending}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="bg-emerald-600 hover:bg-emerald-500"
            disabled={isPending}
            onClick={() => void handleSubmit()}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gamepad2 className="mr-2 h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Create session"}
          </Button>
        )}
      </div>
    </div>
  );
}
