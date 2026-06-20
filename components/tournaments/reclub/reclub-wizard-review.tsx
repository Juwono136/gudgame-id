"use client";

import {
  FileText,
  Gamepad2,
  Pencil,
  ScrollText,
  Users,
} from "lucide-react";
import { TournamentCoverPreview } from "@/components/tournaments/form/tournament-cover-preview";
import { TournamentReviewRichBlock } from "@/components/tournaments/form/tournament-review-rich-block";
import { TournamentVenueMapPreview } from "@/components/tournaments/form/tournament-venue-map-preview";
import { formatWizardDateRange, formatWizardDateTime } from "@/lib/tournaments/form/format-wizard-dates";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";

type ReclubWizardReviewProps = {
  sportName: string;
  name: string;
  slug: string;
  sportSlug: string;
  venue: string;
  venueMapsUrl: string;
  coverPreviewUrl: string | null;
  showCover: boolean;
  playersPerTeam: string;
  maxTeams: string;
  maxRounds: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  description: string;
  rules: string;
  isEdit?: boolean;
  onEditStep?: (stepIndex: number) => void;
};

function ReviewSection({
  title,
  icon: Icon,
  stepIndex,
  onEditStep,
  children,
}: {
  title: string;
  icon: typeof Gamepad2;
  stepIndex: number;
  onEditStep?: (stepIndex: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-emerald-500/15 bg-cp-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3>
        </div>
        {onEditStep ? (
          <button
            type="button"
            onClick={() => onEditStep(stepIndex)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border px-2.5 py-1.5 text-xs font-medium text-cp-muted transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-cp-border/60 bg-cp-elevated/20 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

export function ReclubWizardReview({
  sportName,
  name,
  slug,
  sportSlug,
  venue,
  venueMapsUrl,
  coverPreviewUrl,
  showCover,
  playersPerTeam,
  maxTeams,
  maxRounds,
  startsAt,
  endsAt,
  summary,
  description,
  rules,
  isEdit,
  onEditStep,
}: ReclubWizardReviewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/90">
        <p className="font-medium text-emerald-200">
          {isEdit ? "Review your changes" : "Ready to publish"}
        </p>
        <p className="mt-1 text-xs text-emerald-300/80">
          Free reclub session — no official ranking impact. Public URL uses your sport slug and
          session name.
        </p>
      </div>

      {showCover && coverPreviewUrl ? (
        <div className="relative h-44 overflow-hidden rounded-xl border border-cp-border sm:h-52">
          <TournamentCoverPreview src={coverPreviewUrl} fill />
          <div className="absolute inset-0 bg-gradient-to-t from-cp-bg via-cp-bg/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-lg font-bold text-foreground drop-shadow-sm">{name}</p>
            <p className="text-sm text-cp-muted">{sportName}</p>
          </div>
        </div>
      ) : null}

      <ReviewSection title="Basics" icon={Gamepad2} stepIndex={0} onEditStep={onEditStep}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <ReviewField label="Sport" value={sportName} />
          <ReviewField label="Session name" value={name} />
          <ReviewField label="Public URL" value={`/sports/${sportSlug}/tournaments/${slug}`} />
          <ReviewField label="Venue" value={venue.trim() || "—"} />
        </dl>
        {venueMapsUrl.trim() ? (
          <div className="mt-3">
            <TournamentVenueMapPreview venue={venue} mapsUrl={venueMapsUrl} />
          </div>
        ) : null}
        <div className="mt-3">
          <TournamentReviewRichBlock
            label="Summary"
            html={summary}
            containerClassName="border-emerald-500/15"
          />
        </div>
      </ReviewSection>

      <ReviewSection title="Schedule & squads" icon={Users} stepIndex={1} onEditStep={onEditStep}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <ReviewField label="Players per team" value={playersPerTeam} />
          <ReviewField label="Max squads" value={maxTeams} />
          <ReviewField label="Rounds" value={maxRounds} />
          <ReviewField label="Format" value="Open play (reclub)" />
          <div className="sm:col-span-2">
            <ReviewField label="Schedule" value={formatWizardDateRange(startsAt, endsAt)} />
          </div>
        </dl>
        {startsAt && endsAt ? (
          <p className="mt-2 text-xs text-cp-muted">
            Starts: {formatWizardDateTime(startsAt) ?? startsAt}
            {` · Ends: ${formatWizardDateTime(endsAt) ?? endsAt}`}
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-500/90">
            Start and end times are required — they control when players can join and play.
          </p>
        )}
      </ReviewSection>

      <ReviewSection title="Details & rules" icon={ScrollText} stepIndex={2} onEditStep={onEditStep}>
        <div className="space-y-3">
          <TournamentReviewRichBlock
            label="Description"
            html={description}
            containerClassName="border-emerald-500/15"
          />
          <TournamentReviewRichBlock
            label="House rules"
            html={rules}
            containerClassName="border-emerald-500/15"
          />
        </div>
        {!stripHtmlToText(description) && !stripHtmlToText(rules) ? (
          <p className="text-sm text-cp-muted">No extended description or house rules added.</p>
        ) : null}
      </ReviewSection>

      <ReviewSection title="Visibility" icon={FileText} stepIndex={0} onEditStep={onEditStep}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <ReviewField label="Type" value="Reclub (free)" />
          <ReviewField label="Ranking" value="No official impact" />
          <ReviewField label="Registration fee" value="Free" />
          <ReviewField
            label="Status"
            value={isEdit ? "Keeps current lifecycle status" : "Upcoming"}
          />
        </dl>
      </ReviewSection>
    </div>
  );
}
