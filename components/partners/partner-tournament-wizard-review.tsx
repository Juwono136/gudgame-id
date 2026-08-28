"use client";

import {
  Calendar,
  Gamepad2,
  MapPin,
  Pencil,
  Trophy,
  Users,
} from "lucide-react";
import { TournamentCoverPreview } from "@/components/tournaments/form/tournament-cover-preview";
import { TournamentReviewRichBlock } from "@/components/tournaments/form/tournament-review-rich-block";
import { TournamentVenueMapPreview } from "@/components/tournaments/form/tournament-venue-map-preview";
import { formatIdrDisplay } from "@/components/tournaments/form/currency-input";
import { formatWizardDateRange, formatWizardDateTime } from "@/lib/tournaments/form/format-wizard-dates";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";
import { cn } from "@/lib/utils";

type PartnerTournamentWizardReviewProps = {
  partnerSlug: string;
  name: string;
  categoryLabel: string;
  seriesLabel?: string | null;
  venue: string;
  venueMapsUrl: string;
  coverPreviewUrl?: string | null;
  courtCount: string;
  maxTeams: string;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string;
  entryBilling: "paid" | "free";
  registrationFeeIdr: string;
  formatFamilyLabel: string;
  formatLabel: string;
  matchScoringLabel: string;
  poolRows: { label: string; value: string }[];
  scoringRows: { label: string; value: string }[];
  description: string;
  isEdit?: boolean;
  onEditStep?: (stepIndex: number) => void;
};

function ReviewSection({
  title,
  icon: Icon,
  stepIndex,
  onEditStep,
  children,
  className,
}: {
  title: string;
  icon: typeof Trophy;
  stepIndex: number;
  onEditStep?: (stepIndex: number) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-cp-border bg-cp-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cp-primary/12 text-cp-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3>
        </div>
        {onEditStep ? (
          <button
            type="button"
            onClick={() => onEditStep(stepIndex)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cp-border bg-cp-elevated px-2.5 py-1.5 text-xs font-medium text-cp-primary transition-colors hover:bg-cp-primary/10"
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

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cp-border/60 bg-cp-elevated/30 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{value || "—"}</dd>
    </div>
  );
}

export function PartnerTournamentWizardReview({
  partnerSlug: _partnerSlug,
  name,
  categoryLabel,
  seriesLabel = null,
  venue,
  venueMapsUrl,
  coverPreviewUrl = null,
  courtCount,
  maxTeams,
  startsAt,
  endsAt,
  registrationClosesAt,
  entryBilling,
  registrationFeeIdr,
  formatFamilyLabel,
  formatLabel,
  matchScoringLabel,
  poolRows,
  scoringRows,
  description,
  isEdit,
  onEditStep,
}: PartnerTournamentWizardReviewProps) {
  const hasDescription = Boolean(stripHtmlToText(description));
  const feeIsPaid = entryBilling === "paid";
  const feeDisplay =
    feeIsPaid && Number(registrationFeeIdr) > 0
      ? `Paid · Rp ${formatIdrDisplay(Number(registrationFeeIdr))}`
      : feeIsPaid
        ? "Paid"
        : "Free";

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-cp-primary">
          Final review
        </p>
        <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">
          {isEdit ? "Confirm your changes" : "Confirm your tournament details"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-cp-muted">
          These settings drive registration, pool/bracket generation, match scoring, and public
          pages on your partner site. Use Edit on each section to adjust before saving.
        </p>
      </header>

      {coverPreviewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-cp-border shadow-sm">
          <div className="relative aspect-[21/9] min-h-[10rem] w-full sm:min-h-[12rem]">
            <TournamentCoverPreview src={coverPreviewUrl} fill />
            <div className="absolute inset-0 bg-gradient-to-t from-cp-bg via-cp-bg/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cp-primary">
                Partner white-label event
              </p>
              <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                {name || "Untitled event"}
              </p>
              <p className="mt-0.5 text-sm text-cp-muted">
                {formatFamilyLabel} · {formatLabel}
                {categoryLabel ? ` · ${categoryLabel}` : ""}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-gradient-to-br from-cp-primary/10 via-cp-card to-cp-elevated/40 px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-cp-primary">
            Partner white-label event
          </p>
          <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
            {name || "Untitled event"}
          </p>
          <p className="mt-1 text-sm text-cp-muted">
            {formatFamilyLabel} · {formatLabel}
            {categoryLabel ? ` · ${categoryLabel}` : ""}
            {venue.trim() ? ` · ${venue.trim()}` : ""}
          </p>
          <p className="mt-2 text-xs text-cp-muted">
            No banner yet — add one on Step 1 for a fuller public hero.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewSection title="Event info" icon={Trophy} stepIndex={0} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Name" value={name} />
            <ReviewItem label="Category" value={categoryLabel || "—"} />
            <ReviewItem label="Series" value={seriesLabel?.trim() || "None (optional)"} />
            <ReviewItem label="Entry" value={feeDisplay} />
          </dl>
          <div className="mt-4">
            <TournamentReviewRichBlock label="Description" html={description} />
            {!hasDescription ? (
              <p className="mt-2 text-xs text-cp-muted">
                No description yet — the About section will stay empty.
              </p>
            ) : null}
          </div>
        </ReviewSection>

        <ReviewSection title="Schedule" icon={Calendar} stepIndex={0} onEditStep={onEditStep}>
          <dl className="grid gap-3">
            <ReviewItem
              label="Tournament window"
              value={formatWizardDateRange(startsAt, endsAt) || "—"}
            />
            <ReviewItem
              label="Registration closes"
              value={
                (formatWizardDateTime(registrationClosesAt) ?? registrationClosesAt) || "—"
              }
            />
          </dl>
        </ReviewSection>

        <ReviewSection
          title="Venue"
          icon={MapPin}
          stepIndex={0}
          onEditStep={onEditStep}
          className="lg:col-span-2"
        >
          {venue.trim() ? (
            <TournamentVenueMapPreview venue={venue} mapsUrl={venueMapsUrl} />
          ) : (
            <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-8 text-center text-sm text-cp-muted">
              No venue set. Add a location on Step 1.
            </div>
          )}
        </ReviewSection>

        <ReviewSection title="Format & capacity" icon={Users} stepIndex={1} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Match family" value={formatFamilyLabel} />
            <ReviewItem label="Structure" value={formatLabel} />
            <ReviewItem label="Max teams" value={maxTeams || "—"} />
            <ReviewItem label="Courts" value={courtCount || "—"} />
            {poolRows.map((row) => (
              <ReviewItem key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </ReviewSection>

        <ReviewSection title="Match scoring" icon={Gamepad2} stepIndex={1} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Scoring rules" value={matchScoringLabel} />
            {scoringRows.map((row) => (
              <ReviewItem key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-cp-muted">
            Live tablet vs paper score entry is configured under Manage → Display after publish.
          </p>
        </ReviewSection>
      </div>
    </div>
  );
}
