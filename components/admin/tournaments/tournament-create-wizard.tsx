"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { WikiStepper } from "@/components/admin/wiki/wiki-stepper";
import { CurrencyInput, formatIdrDisplay } from "@/components/tournaments/form/currency-input";
import { TournamentCoverPreview } from "@/components/tournaments/form/tournament-cover-preview";
import {
  TournamentCoverUpload,
  type TournamentCoverValue,
} from "@/components/tournaments/form/tournament-cover-upload";
import { revokeLocalPreviewUrl } from "@/lib/tournaments/cover-preview-url";
import { TournamentGearPicker } from "@/components/tournaments/form/tournament-gear-picker";
import { VenueAutocompleteField } from "@/components/tournaments/form/venue-autocomplete-field";
import { uploadTournamentCoverClient } from "@/lib/tournaments/upload-cover-client";
import { Button } from "@/components/ui/button";
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
import { getTournamentRuleSections, getVenueMapsUrl } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getSportTournamentDefaults } from "@/lib/tournaments/sport-config";
import {
  TOURNAMENT_STATUSES,
  TOURNAMENT_TYPES,
  type TournamentStatus,
  type TournamentType,
} from "@/lib/domain/tournaments";
import type { TournamentUpsertInput } from "@/lib/validations/tournaments";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "schedule", label: "Schedule & rules" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TYPE_LABELS: Record<TournamentType, string> = {
  official: "Official — paid & ranked",
  recreational: "Reclub — free community play",
};

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
  initial?: TournamentDetail;
  tournamentId?: number;
};

export function TournamentCreateWizard({
  sportSlug,
  onBack,
  mode = "admin",
  initial,
  tournamentId,
}: TournamentCreateWizardProps) {
  const isEdit = Boolean(initial && tournamentId);
  const adminCreate = useCreateTournament();
  const hostCreate = useCreateHostTournament();
  const adminUpdate = useUpdateAdminTournament(tournamentId ?? 0);
  const hostUpdate = useUpdateManageTournament(tournamentId ?? 0);
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
    initial?.tournamentType ?? "official",
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
  const [eligibilityRules, setEligibilityRules] = useState(
    initialRules?.eligibilityHtml ?? "",
  );
  const [matchFormatRules, setMatchFormatRules] = useState(
    initialRules?.matchFormatHtml ?? initial?.rules ?? "",
  );
  const [equipmentStandardsRules, setEquipmentStandardsRules] = useState(
    initialRules?.equipmentStandardsHtml ?? "",
  );
  const [gearEntityIds, setGearEntityIds] = useState<number[]>(
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
    setEligibilityRules(sections.eligibilityHtml ?? "");
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
      format: (initial?.format ?? "single_elimination") as TournamentUpsertInput["format"],
      rules: tournamentType === "recreational" ? rules : undefined,
      eligibilityRules: tournamentType === "official" ? eligibilityRules : undefined,
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
    };
  };

  const validateStep = (): boolean => {
    if (currentStepId === "basics") {
      if (!name.trim()) {
        toast.error("Tournament name is required");
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
    if (currentStepId === "schedule") {
      if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
        toast.error("End date must be after start date");
        return false;
      }
    }
    return true;
  };

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
            router.push(mode === "admin" ? adminRoutes.wikiEntities : dashboardRoutes.tournaments);
          },
        });
        return;
      }
      createMutation.mutate(payload, {
        onSuccess: (tournament) => {
          if (mode === "host") {
            router.push(dashboardRoutes.hostTournament(tournament.id));
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

  return (
    <div className="mx-auto max-w-4xl">
      <WikiStepper steps={[...STEPS]} currentIndex={stepIndex} />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-6 space-y-6"
        >
          {currentStepId === "basics" ? (
            <section className="space-y-6 rounded-xl border border-cp-border bg-cp-card/50 p-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tournament basics</h2>
                <p className="mt-1 text-sm text-cp-muted">
                  {isEdit ? "Update" : "Create"} a tournament for{" "}
                  <span className="font-medium capitalize text-cp-logo-accent">{sportSlug}</span>.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="t-name">Name</Label>
                  <Input
                    id="t-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Premier Padel Open 2026"
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-slug">URL slug</Label>
                  <Input
                    id="t-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={resolvedSlug || "auto-generated"}
                    disabled={isEdit}
                    className="border-cp-border bg-cp-elevated disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={tournamentType}
                    onValueChange={(v) => setTournamentType(v as TournamentType)}
                    disabled={isEdit}
                  >
                    <SelectTrigger className="border-cp-border bg-cp-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOURNAMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <Label htmlFor="t-category">Category label</Label>
                      <Input
                        id="t-category"
                        value={categoryLabel}
                        onChange={(e) => setCategoryLabel(e.target.value)}
                        placeholder="P1 · Men's doubles"
                        className="border-cp-border bg-cp-elevated"
                      />
                    </div>
                  </>
                ) : null}
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
                />
              </div>

              <div>
                <Label>Description</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Overview, format, prizes…"
                  minHeight={160}
                />
              </div>

              <TournamentCoverUpload value={cover} onChange={setCover} />
            </section>
          ) : null}

          {currentStepId === "schedule" ? (
            <section className="space-y-6 rounded-xl border border-cp-border bg-cp-card/50 p-6">
              <h2 className="text-lg font-semibold text-foreground">Schedule & rules</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <DateTimePicker label="Starts" value={startsAt} onChange={setStartsAt} />
                <DateTimePicker label="Ends" value={endsAt} onChange={setEndsAt} min={startsAt} />
                {tournamentType === "official" ? (
                  <div className="sm:col-span-2">
                    <DateTimePicker
                      label="Registration closes"
                      value={registrationClosesAt}
                      onChange={setRegistrationClosesAt}
                    />
                  </div>
                ) : null}
              </div>

              <VenueAutocompleteField
                venue={venue}
                mapsUrl={venueMapsUrl}
                onVenueChange={setVenue}
                onMapsUrlChange={setVenueMapsUrl}
              />

              {tournamentType === "official" ? (
                <div className="space-y-6">
                  <div>
                    <Label>Eligibility & categories</Label>
                    <p className="mb-2 text-xs text-cp-muted">
                      Who can register, age/skill requirements, category notes.
                    </p>
                    <RichTextEditor
                      value={eligibilityRules}
                      onChange={setEligibilityRules}
                      placeholder="Eligibility and category rules…"
                      minHeight={140}
                    />
                  </div>
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
                  />
                </div>
              )}
            </section>
          ) : null}

          {currentStepId === "review" ? (
            <section className="space-y-4 rounded-xl border border-cp-border bg-cp-card/50 p-6">
              <h2 className="text-lg font-semibold text-foreground">Review</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <ReviewRow label="Name" value={name} />
                <ReviewRow label="Slug" value={`/${resolvedSlug}`} />
                <ReviewRow label="Type" value={TYPE_LABELS[tournamentType]} />
                <ReviewRow label="Status" value={STATUS_LABELS[status]} />
                <ReviewRow label="Venue" value={venue || "—"} />
                <ReviewRow
                  label="Fee"
                  value={
                    registrationFeeIdr
                      ? `Rp ${formatIdrDisplay(Number(registrationFeeIdr))}`
                      : "Free"
                  }
                />
                <ReviewRow
                  label="Schedule"
                  value={
                    startsAt
                      ? `${startsAt}${endsAt ? ` → ${endsAt}` : ""}`
                      : "Not scheduled"
                  }
                />
              </dl>
              {cover.previewUrl && !cover.removed ? (
                <div className="relative mt-4 h-44 overflow-hidden rounded-xl border border-cp-border sm:h-52">
                  <TournamentCoverPreview src={cover.previewUrl} fill />
                  <div className="absolute inset-0 bg-gradient-to-t from-cp-bg via-cp-bg/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-lg font-bold text-foreground drop-shadow-sm">{name}</p>
                    <p className="text-sm text-cp-muted capitalize">{sportSlug}</p>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-cp-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Change classification
          </button>
        ) : isEdit ? (
          <Link
            href={dashboardRoutes.tournaments}
            className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Tournament history
          </Link>
        ) : mode === "host" ? (
          <Link
            href={dashboardRoutes.hostTournaments}
            className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            All tournaments
          </Link>
        ) : (
          <Link
            href={adminRoutes.wikiEntities}
            className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to database
          </Link>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="border-cp-border"
              onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
          ) : null}
          {!isLast ? (
            <Button
              type="button"
              className="bg-cp-primary hover:bg-cp-primary-light"
              onClick={() => {
                if (!validateStep()) return;
                setStepIndex((s) => s + 1);
              }}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-cp-primary hover:bg-cp-primary-light"
              disabled={isPending}
              onClick={() => void handleSubmit()}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create tournament"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-cp-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
