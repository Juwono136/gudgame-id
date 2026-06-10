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
import { TournamentCoverPreview } from "@/components/tournaments/form/tournament-cover-preview";
import {
  TournamentCoverUpload,
  type TournamentCoverValue,
} from "@/components/tournaments/form/tournament-cover-upload";
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
import { useCreatePlayerReclubTournament } from "@/hooks/use-host-tournaments";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { getSportTournamentDefaults } from "@/lib/tournaments/sport-config";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "basics", label: "Basics", icon: Gamepad2 },
  { id: "schedule", label: "Schedule & teams", icon: CalendarDays },
  { id: "details", label: "Details", icon: Users },
  { id: "review", label: "Review", icon: MapPin },
] as const;

type SportOption = { slug: string; name: string };

type PlayerCreateReclubWizardProps = {
  sports: SportOption[];
  defaultSportSlug?: string;
};

export function PlayerCreateReclubWizard({
  sports,
  defaultSportSlug = "padel",
}: PlayerCreateReclubWizardProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const createMutation = useCreatePlayerReclubTournament();

  const [step, setStep] = useState(0);
  const [sportSlug, setSportSlug] = useState(defaultSportSlug);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [venue, setVenue] = useState("");
  const [venueMapsUrl, setVenueMapsUrl] = useState("");
  const [cover, setCover] = useState<TournamentCoverValue>({
    previewUrl: null,
    storageKey: null,
    pendingFile: null,
    removed: false,
  });
  const coverPreviewRef = useRef(cover.previewUrl);
  coverPreviewRef.current = cover.previewUrl;

  useEffect(() => {
    return () => revokeLocalPreviewUrl(coverPreviewRef.current);
  }, []);

  const defaults = getSportTournamentDefaults(sportSlug);
  const [playersPerTeam, setPlayersPerTeam] = useState(String(defaults.playersPerTeam));
  const [maxTeams, setMaxTeams] = useState(String(Math.min(defaults.maxTeams, 16)));
  const [maxRounds, setMaxRounds] = useState("3");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const slug = useMemo(() => slugifyWikiName(name || "reclub-session"), [name]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Session name is required");
      return;
    }

    const ok = await confirm({
      title: "Create reclub session?",
      description:
        "This is a free community session. It won't affect official rankings.",
      confirmLabel: "Create",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    try {
      let coverKey: string | undefined;
      if (!cover.removed) {
        if (cover.pendingFile) {
          const uploaded = await uploadTournamentCoverClient(cover.pendingFile, sportSlug);
          coverKey = uploaded.storageKey;
        } else if (cover.storageKey) {
          coverKey = cover.storageKey;
        }
      }

      createMutation.mutate(
        {
          sportSlug,
          name: name.trim(),
          slug,
          summary: summary.trim() || undefined,
          description: description.trim() || undefined,
          rules: rules.trim() || undefined,
          venue: venue.trim() || undefined,
          venueMapsUrl: venueMapsUrl.trim() || undefined,
          coverImageStorageKey: coverKey,
          tournamentType: "recreational",
          status: "upcoming",
          playersPerTeam: Number(playersPerTeam) || 2,
          maxTeams: Number(maxTeams) || 8,
          maxRounds: Number(maxRounds) || 3,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
          format: "open_play",
        },
        {
          onSuccess: (tournament) => {
            router.push(publicSportRoutes.tournament(tournament.sportSlug, tournament.slug));
          },
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Banner upload failed");
    }
  };

  const canNext = step === 0 ? Boolean(name.trim()) : true;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <LoadingOverlay show={createMutation.isPending} label="Creating session…" />

      <Link
        href={dashboardRoutes.tournaments}
        className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Tournament history
      </Link>

      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-950/30 via-cp-card to-cp-bg p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
            <Gamepad2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Create reclub session
            </h1>
            <p className="mt-1 text-sm text-cp-muted">
              Free community play — no official ranking impact. Open to all members.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : done
                      ? "border-cp-border bg-cp-elevated/50 hover:border-emerald-500/30"
                      : "border-cp-border/60 bg-cp-elevated/20 opacity-60",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active || done ? "text-emerald-400" : "text-cp-muted",
                  )}
                />
                <p className="mt-1 text-xs font-semibold text-foreground">{s.label}</p>
              </button>
            );
          })}
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
                </div>
                <div className="sm:col-span-2">
                  <Label>Session name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Friday night sparring"
                    className="mt-1.5 border-cp-border bg-cp-bg-input"
                  />
                  <p className="mt-1 text-xs text-cp-muted">URL: /sports/{sportSlug}/tournaments/{slug}</p>
                </div>
              </div>

              <div>
                <Label>Short summary</Label>
                <p className="mb-2 text-xs text-cp-muted">Rich text — shown on the tournament card and header.</p>
                <RichTextEditor
                  value={summary}
                  onChange={setSummary}
                  placeholder="What is this session about?"
                  minHeight={120}
                />
              </div>

              <TournamentCoverUpload value={cover} onChange={setCover} />

              <VenueAutocompleteField
                venue={venue}
                mapsUrl={venueMapsUrl}
                onVenueChange={setVenue}
                onMapsUrlChange={setVenueMapsUrl}
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
                    How many matches can be played in this session (fixed at creation).
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(e.target.value)}
                    className="mt-1.5 max-w-[120px] border-cp-border bg-cp-bg-input"
                  />
                </div>
              </div>
              <DateTimePicker label="Starts at" value={startsAt} onChange={setStartsAt} />
              <DateTimePicker
                label="Ends at (optional)"
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
                <p className="mb-2 text-xs text-cp-muted">Detailed info for the tournament overview tab.</p>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Format, skill level, what to bring…"
                  minHeight={160}
                />
              </div>
              <div>
                <Label>House rules (optional)</Label>
                <RichTextEditor
                  value={rules}
                  onChange={setRules}
                  placeholder="Scoring, rotation, fair play…"
                  minHeight={120}
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              {cover.previewUrl && !cover.removed ? (
                <div className="relative h-44 overflow-hidden rounded-xl border border-cp-border sm:h-52">
                  <TournamentCoverPreview src={cover.previewUrl} fill />
                  <div className="absolute inset-0 bg-gradient-to-t from-cp-bg via-cp-bg/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-lg font-bold text-foreground drop-shadow-sm">{name}</p>
                    <p className="text-sm text-cp-muted">
                      {sports.find((s) => s.slug === sportSlug)?.name}
                    </p>
                  </div>
                </div>
              ) : null}
              <dl className="grid gap-3 sm:grid-cols-2">
                <ReviewRow label="Sport" value={sports.find((s) => s.slug === sportSlug)?.name ?? sportSlug} />
                <ReviewRow label="Name" value={name} />
                <ReviewRow label="Venue" value={venue || "—"} />
                <ReviewRow label="Maps" value={venueMapsUrl ? "Linked" : "—"} />
                <ReviewRow label="Team size" value={playersPerTeam} />
                <ReviewRow label="Max squads" value={maxTeams} />
                <ReviewRow label="Rounds" value={maxRounds} />
                <ReviewRow
                  label="Starts"
                  value={
                    startsAt
                      ? new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(startsAt))
                      : "—"
                  }
                />
                <ReviewRow label="Format" value="Open play (reclub)" />
              </dl>
              {summary ? (
                <div className="rounded-xl border border-cp-border bg-cp-elevated/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">Summary preview</p>
                  <div
                    className="prose prose-invert mt-2 max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: summary }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          className="border-cp-border"
          disabled={step === 0 || createMutation.isPending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            className="bg-emerald-600 hover:bg-emerald-500"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="bg-emerald-600 hover:bg-emerald-500"
            disabled={createMutation.isPending}
            onClick={() => void handleCreate()}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gamepad2 className="mr-2 h-4 w-4" />
            )}
            Create session
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cp-border/60 bg-cp-elevated/20 px-4 py-3">
      <dt className="text-xs text-cp-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
