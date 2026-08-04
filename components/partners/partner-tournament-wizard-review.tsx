"use client";

import Link from "next/link";
import {
  Calendar,
  FileText,
  Gamepad2,
  MapPin,
  Pencil,
  Trophy,
  Users,
} from "lucide-react";
import { TournamentReviewRichBlock } from "@/components/tournaments/form/tournament-review-rich-block";
import { TournamentVenueMapPreview } from "@/components/tournaments/form/tournament-venue-map-preview";
import { formatIdrDisplay } from "@/components/tournaments/form/currency-input";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { formatWizardDateRange, formatWizardDateTime } from "@/lib/tournaments/form/format-wizard-dates";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";
import { cn } from "@/lib/utils";

type PartnerTournamentWizardReviewProps = {
  partnerSlug: string;
  name: string;
  categoryLabel: string;
  venue: string;
  venueMapsUrl: string;
  courtCount: string;
  maxTeams: string;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string;
  entryBilling: "paid" | "free";
  registrationFeeIdr: string;
  formatLabel: string;
  matchFormatLabel: string;
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
  partnerSlug,
  name,
  categoryLabel,
  venue,
  venueMapsUrl,
  courtCount,
  maxTeams,
  startsAt,
  endsAt,
  registrationClosesAt,
  entryBilling,
  registrationFeeIdr,
  formatLabel,
  matchFormatLabel,
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
          These settings drive registration capacity, pool/bracket generation, match scoring, and
          public pages on your partner site. Use Edit on each section to adjust before saving.
        </p>
      </header>

      <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-gradient-to-br from-cp-primary/10 via-cp-card to-cp-elevated/40 px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cp-primary">
          Partner white-label event
        </p>
        <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{name || "Untitled event"}</p>
        <p className="mt-1 text-sm text-cp-muted">
          {formatLabel}
          {categoryLabel ? ` · ${categoryLabel}` : ""}
          {venue.trim() ? ` · ${venue.trim()}` : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewSection title="Basics" icon={Trophy} stepIndex={0} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Name" value={name} />
            <ReviewItem label="Category" value={categoryLabel || "Not set (optional)"} />
            <ReviewItem label="Max teams" value={maxTeams || "—"} />
            <ReviewItem label="Courts" value={courtCount || "—"} />
            <ReviewItem label="Entry" value={feeDisplay} />
            <ReviewItem label="Players per team" value="2 (fixed pairs)" />
          </dl>
          <div className="mt-4">
            <TournamentReviewRichBlock label="Description" html={description} />
            {!hasDescription ? (
              <p className="mt-2 text-xs text-cp-muted">
                No public description yet — guests will see format and venue only.
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
          {startsAt && endsAt ? (
            <p className="mt-3 text-xs leading-relaxed text-cp-muted">
              Starts {formatWizardDateTime(startsAt) ?? startsAt}
              {" · "}
              Ends {formatWizardDateTime(endsAt) ?? endsAt}. Guests can register until the
              deadline (including after start, if you allow it).
            </p>
          ) : null}
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
              No venue set. Add a location on the Basics step.
            </div>
          )}
        </ReviewSection>

        <ReviewSection title="Format" icon={Users} stepIndex={1} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Structure" value={formatLabel} />
            {poolRows.map((row) => (
              <ReviewItem key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-cp-muted">
            Pool size and advancement control bracket seeding when you generate groups on Manage.
          </p>
        </ReviewSection>

        <ReviewSection title="Scoring" icon={Gamepad2} stepIndex={2} onEditStep={onEditStep}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Match format" value={matchFormatLabel} />
            {scoringRows.map((row) => (
              <ReviewItem key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-cp-muted">
            Live tablet vs paper score entry is configured later under Manage → Display.
          </p>
        </ReviewSection>

        <ReviewSection
          title="Isolation & publish"
          icon={FileText}
          stepIndex={3}
          onEditStep={onEditStep}
          className="lg:col-span-2"
        >
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReviewItem label="Surface" value="Partner white-label" />
            <ReviewItem label="Rankings" value="Never on Gud Game" />
            <ReviewItem label="Skill tiers" value="Not used" />
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-cp-muted">
            Stats and players stay on{" "}
            <Link
              href={partnerPublicRoutes.home(partnerSlug)}
              className="font-medium text-cp-primary hover:underline"
            >
              /{partnerSlug}
            </Link>{" "}
            only.
            {feeIsPaid
              ? ` Guests pay Rp ${formatIdrDisplay(
                  Number(registrationFeeIdr) || 0,
                )} via your partner payment flow.`
              : " Guest registration is free confirmation only."}
          </p>
        </ReviewSection>
      </div>
    </div>
  );
}
