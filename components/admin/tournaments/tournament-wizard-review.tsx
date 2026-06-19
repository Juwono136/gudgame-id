"use client";

import {
  Calendar,
  Coins,
  FileText,
  Pencil,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { TournamentCoverPreview } from "@/components/tournaments/form/tournament-cover-preview";
import { TournamentVenueMapPreview } from "@/components/tournaments/form/tournament-venue-map-preview";
import { formatIdrDisplay } from "@/components/tournaments/form/currency-input";
import { formatWizardDateRange, formatWizardDateTime } from "@/lib/tournaments/form/format-wizard-dates";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";
import type { TournamentType } from "@/lib/domain/tournaments";
import { cn } from "@/lib/utils";

type TournamentWizardReviewProps = {
  name: string;
  slug: string;
  sportSlug: string;
  tournamentType: TournamentType;
  typeLabel: string;
  statusLabel: string;
  visibilityLabel: string;
  venue: string;
  venueMapsUrl: string;
  coverPreviewUrl: string | null;
  showCover: boolean;
  registrationFeeIdr: string;
  prizePoolIdr: string;
  categoryLabel: string;
  maxTeams: string;
  playersPerTeam: string;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string;
  summary: string;
  description: string;
  eligibilityRules: string;
  matchFormatRules: string;
  equipmentStandardsRules: string;
  rules: string;
  gearCount: number;
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
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{value || "—"}</dd>
    </div>
  );
}

function ReviewTextBlock({ label, html }: { label: string; html: string }) {
  const plain = stripHtmlToText(html);
  if (!plain) return null;
  const preview = plain.length > 280 ? `${plain.slice(0, 280)}…` : plain;
  return (
    <div className="rounded-lg border border-cp-border/60 bg-cp-elevated/20 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{preview}</p>
    </div>
  );
}

export function TournamentWizardReview({
  name,
  slug,
  sportSlug,
  tournamentType,
  typeLabel,
  statusLabel,
  visibilityLabel,
  venue,
  venueMapsUrl,
  coverPreviewUrl,
  showCover,
  registrationFeeIdr,
  prizePoolIdr,
  categoryLabel,
  maxTeams,
  playersPerTeam,
  startsAt,
  endsAt,
  registrationClosesAt,
  summary,
  description,
  eligibilityRules,
  matchFormatRules,
  equipmentStandardsRules,
  rules,
  gearCount,
  onEditStep,
}: TournamentWizardReviewProps) {
  const isOfficial = tournamentType === "official";
  const feeDisplay =
    registrationFeeIdr && Number(registrationFeeIdr) > 0
      ? `Rp ${formatIdrDisplay(Number(registrationFeeIdr))}`
      : "Free";
  const prizeDisplay =
    prizePoolIdr && Number(prizePoolIdr) > 0
      ? `Rp ${formatIdrDisplay(Number(prizePoolIdr))}`
      : "Not set";

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-cp-primary">
          Final review
        </p>
        <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">
          Confirm your tournament details
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-cp-muted">
          Check everything below before saving. Use Edit on each section or the stepper above to
          make changes.
        </p>
      </header>

      {showCover && coverPreviewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-cp-border shadow-sm">
          <div className="relative aspect-[21/9] min-h-[10rem] w-full sm:min-h-[12rem]">
            <TournamentCoverPreview src={coverPreviewUrl} fill />
            <div className="absolute inset-0 bg-gradient-to-t from-cp-bg via-cp-bg/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cp-primary sm:text-xs">
                {typeLabel}
              </p>
              <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{name}</p>
              <p className="mt-0.5 text-sm capitalize text-cp-muted">{sportSlug}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewSection title="Basics" icon={Trophy} stepIndex={0} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Name" value={name} />
            <ReviewItem label="URL slug" value={`/${slug}`} />
            <ReviewItem label="Type" value={typeLabel} />
            <ReviewItem label="Visibility" value={visibilityLabel} />
            <ReviewItem label="Computed status" value={statusLabel} />
            <ReviewItem label="Sport" value={sportSlug} />
            {categoryLabel ? <ReviewItem label="Category" value={categoryLabel} /> : null}
          </dl>
          <div className="mt-4 space-y-3">
            <ReviewTextBlock label="Summary" html={summary} />
            <ReviewTextBlock label="Description" html={description} />
          </div>
        </ReviewSection>

        <ReviewSection title="Capacity & fees" icon={Users} stepIndex={0} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Max teams" value={maxTeams || "—"} />
            <ReviewItem label="Players per team" value={playersPerTeam || "—"} />
            {isOfficial ? (
              <>
                <ReviewItem label="Registration fee" value={feeDisplay} />
                <ReviewItem label="Prize pool" value={prizeDisplay} />
              </>
            ) : null}
          </dl>
        </ReviewSection>

        <ReviewSection
          title="Schedule"
          icon={Calendar}
          stepIndex={1}
          onEditStep={onEditStep}
          className="lg:col-span-2"
        >
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReviewItem
              label="Tournament dates"
              value={formatWizardDateRange(startsAt, endsAt)}
            />
            {isOfficial && registrationClosesAt ? (
              <ReviewItem
                label="Registration closes"
                value={formatWizardDateTime(registrationClosesAt) ?? registrationClosesAt}
              />
            ) : null}
          </dl>
        </ReviewSection>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground sm:text-base">Venue & location</h3>
            {onEditStep ? (
              <button
                type="button"
                onClick={() => onEditStep(1)}
                className="inline-flex items-center gap-1 rounded-lg border border-cp-border bg-cp-card px-2.5 py-1.5 text-xs font-medium text-cp-primary transition-colors hover:bg-cp-primary/10"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            ) : null}
          </div>
          {venue.trim() ? (
            <TournamentVenueMapPreview venue={venue} mapsUrl={venueMapsUrl} />
          ) : (
            <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-8 text-center text-sm text-cp-muted">
              No venue set. Add a location on the Schedule & rules step.
            </div>
          )}
        </div>

        {isOfficial ? (
          <ReviewSection
            title="Rules & equipment"
            icon={Shield}
            stepIndex={1}
            onEditStep={onEditStep}
            className="lg:col-span-2"
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <ReviewTextBlock label="Eligibility & categories" html={eligibilityRules} />
              <ReviewTextBlock label="Match format" html={matchFormatRules} />
              <ReviewTextBlock label="Equipment standards" html={equipmentStandardsRules} />
              <ReviewItem
                label="Approved equipment"
                value={gearCount > 0 ? `${gearCount} item${gearCount === 1 ? "" : "s"} selected` : "None selected"}
              />
            </div>
          </ReviewSection>
        ) : (
          <ReviewSection
            title="Rules"
            icon={FileText}
            stepIndex={1}
            onEditStep={onEditStep}
            className="lg:col-span-2"
          >
            <ReviewTextBlock label="Tournament rules" html={rules} />
          </ReviewSection>
        )}

        {isOfficial ? (
          <div className="flex items-start gap-3 rounded-xl border border-cp-primary/25 bg-cp-primary/5 p-4 sm:p-5 lg:col-span-2">
            <Coins className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Official paid tournament</p>
              <p className="mt-1 leading-relaxed text-cp-muted">
                Players will pay {feeDisplay} at registration. Payouts and receipts are handled
                through your host payments ledger after teams complete payment.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
