"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WikiStepper } from "@/components/admin/wiki/wiki-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTournament } from "@/hooks/use-tournaments";
import { adminRoutes } from "@/lib/constants/routes";
import { slugifyWikiName } from "@/lib/wiki/slug";
import {
  TOURNAMENT_STATUSES,
  TOURNAMENT_TYPES,
  type TournamentStatus,
  type TournamentType,
} from "@/db/schema/tournaments";
import type { TournamentUpsertInput } from "@/lib/validations/tournaments";
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
  official: "Official / legal",
  recreational: "Recreational / reclub",
  sparring: "Sparring / free play",
};

type TournamentCreateWizardProps = {
  sportSlug: string;
  onBack?: () => void;
};

export function TournamentCreateWizard({ sportSlug, onBack }: TournamentCreateWizardProps) {
  const createMutation = useCreateTournament();
  const [stepIndex, setStepIndex] = useState(0);
  const currentStepId = STEPS[stepIndex]?.id ?? "basics";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TournamentStatus>("draft");
  const [tournamentType, setTournamentType] = useState<TournamentType>("official");
  const [venue, setVenue] = useState("");
  const [rules, setRules] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const resolvedSlug = slug.trim() || slugifyWikiName(name);

  const payload = useMemo((): TournamentUpsertInput => {
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
      rules,
      venue,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
    };
  }, [
    name,
    resolvedSlug,
    summary,
    description,
    status,
    tournamentType,
    rules,
    venue,
    startsAt,
    endsAt,
  ]);

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
    }
    if (currentStepId === "schedule") {
      if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
        toast.error("End date must be after start date");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateStep()) return;
    createMutation.mutate(payload);
  };

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
            <section className="space-y-4 rounded-xl border border-cp-border bg-cp-card/50 p-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tournament basics</h2>
                <p className="mt-1 text-sm text-cp-muted">
                  Create a tournament for{" "}
                  <span className="font-medium capitalize text-cp-logo-accent">
                    {sportSlug}
                  </span>
                  . Teams and brackets will be configured in the tournament workspace later.
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
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={tournamentType}
                    onValueChange={(v) => setTournamentType(v as TournamentType)}
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
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as TournamentStatus)}
                  >
                    <SelectTrigger className="border-cp-border bg-cp-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOURNAMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="t-summary">Short summary</Label>
                  <Input
                    id="t-summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="One-line description for listings"
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="t-desc">Description</Label>
                  <textarea
                    id="t-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Overview, format, prizes…"
                    className={cn(
                      "flex w-full rounded-md border border-cp-border bg-cp-elevated px-3 py-2 text-sm text-foreground",
                      "placeholder:text-cp-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary/40",
                    )}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {currentStepId === "schedule" ? (
            <section className="space-y-4 rounded-xl border border-cp-border bg-cp-card/50 p-6">
              <h2 className="text-lg font-semibold text-foreground">Schedule & rules</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-starts">Starts</Label>
                  <Input
                    id="t-starts"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-ends">Ends</Label>
                  <Input
                    id="t-ends"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="t-venue">Venue</Label>
                  <Input
                    id="t-venue"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Jakarta Padel Arena"
                    className="border-cp-border bg-cp-elevated"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="t-rules">Tournament rules</Label>
                  <textarea
                    id="t-rules"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    rows={6}
                    placeholder="Match format, scoring, registration requirements…"
                    className={cn(
                      "flex w-full rounded-md border border-cp-border bg-cp-elevated px-3 py-2 text-sm text-foreground",
                      "placeholder:text-cp-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary/40",
                    )}
                  />
                </div>
              </div>
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
                  label="Schedule"
                  value={
                    startsAt
                      ? `${startsAt}${endsAt ? ` → ${endsAt}` : ""}`
                      : "Not scheduled"
                  }
                />
              </dl>
              {summary ? (
                <p className="text-sm text-cp-muted">{summary}</p>
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
              disabled={createMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create tournament
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
