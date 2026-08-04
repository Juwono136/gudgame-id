"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Ticket } from "lucide-react";
import { PartnerDashboardCardActions } from "@/components/partners/partner-dashboard-card-actions";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TournamentDiscoveryCta } from "@/lib/tournaments/discovery-cta";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { getTournamentFormatLabel } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";

function formatDateRange(starts: string | null | undefined, ends: string | null | undefined) {
  if (!starts) return null;
  const start = new Date(starts);
  const fmt = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!ends) return fmt.format(start);
  const end = new Date(ends);
  if (start.toDateString() === end.toDateString()) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatIdr(amount: number | null | undefined) {
  if (amount == null || amount <= 0) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function isPaidEntry(t: TournamentListItem) {
  if (t.officialBilling === "paid") return true;
  if (t.officialBilling === "free") return false;
  return (t.registrationFeeIdr ?? 0) > 0;
}

export function PartnerTournamentRow({
  tournament,
  href,
  publicHref,
  manageHref,
  editHref,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
  deleting = false,
  cta,
  className,
}: {
  tournament: TournamentListItem;
  /** Primary navigation target (public open / whole-row link). */
  href?: string;
  publicHref?: string;
  manageHref?: string;
  editHref?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  deleting?: boolean;
  /** Public discovery CTA (Join / Bracket). */
  cta?: TournamentDiscoveryCta;
  className?: string;
}) {
  const cover = tournament.coverImageUrl?.trim() || null;
  const paid = isPaidEntry(tournament);
  const fee = formatIdr(tournament.registrationFeeIdr);
  const formatLabel = getTournamentFormatLabel(tournament.format);
  const dateLabel = formatDateRange(tournament.startsAt, tournament.endsAt);
  const detailHref = href ?? manageHref ?? publicHref;
  const hasDashboardActions = Boolean(manageHref || publicHref || editHref || onDelete);

  const thumb = (
    <span
      className={cn(
        "relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-cp-border bg-cp-elevated sm:h-16 sm:w-16",
        !cover && "bg-gradient-to-br from-cp-primary/20 via-cp-elevated to-cp-card",
      )}
    >
      {cover ? (
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover"
          sizes="64px"
          unoptimized
        />
      ) : null}
    </span>
  );

  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
          {tournament.name}
        </p>
        <PartnerStatusBadge status={tournament.status} />
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-cp-muted">
        {tournament.sportName ? <span>{tournament.sportName}</span> : null}
        {tournament.venue ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{tournament.venue}</span>
          </span>
        ) : null}
        {dateLabel ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            {dateLabel}
          </span>
        ) : null}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge
          className={cn(
            "border-0 text-[10px] font-semibold uppercase tracking-wide",
            paid
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
          )}
        >
          <Ticket className="mr-1 h-3 w-3" aria-hidden />
          {paid ? (fee ? `Paid · ${fee}` : "Paid") : "Free"}
        </Badge>
        <Badge className="border-cp-border bg-cp-elevated/70 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
          {formatLabel}
        </Badge>
        {tournament.categoryLabel?.trim() ? (
          <Badge className="border-cp-border bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
            {tournament.categoryLabel}
          </Badge>
        ) : null}
      </div>
    </div>
  );

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm",
        "transition-colors hover:border-cp-primary/35 hover:shadow-md",
        className,
      )}
    >
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        {detailHref && !hasDashboardActions && !cta ? (
          <Link
            href={detailHref}
            className="flex min-w-0 flex-1 items-start gap-3 sm:items-center"
          >
            {thumb}
            {body}
            <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-full border border-cp-border bg-cp-elevated/50 px-2.5 py-1 text-xs font-semibold text-cp-primary sm:inline-flex">
              Open
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        ) : (
          <>
            {detailHref ? (
              <Link
                href={detailHref}
                className="flex min-w-0 flex-1 items-start gap-3 sm:items-center"
              >
                {thumb}
                {body}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                {thumb}
                {body}
              </div>
            )}

            {cta ? (
              <div className="flex shrink-0 sm:pl-1">
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    "h-9 w-full rounded-full px-4 sm:w-auto",
                    cta.emphasis === "primary"
                      ? "bg-cp-primary hover:bg-cp-primary-light"
                      : "border-cp-border bg-cp-elevated text-foreground hover:bg-cp-elevated/80",
                  )}
                  variant={cta.emphasis === "primary" ? "default" : "outline"}
                >
                  <Link href={cta.href}>
                    {cta.label}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : null}

            {hasDashboardActions && manageHref && publicHref ? (
              <div className="w-full shrink-0 sm:w-auto sm:min-w-[11.5rem]">
                <PartnerDashboardCardActions
                  layout="inline"
                  manageHref={manageHref}
                  publicHref={publicHref}
                  editHref={editHref}
                  onDelete={onDelete}
                  deleteDisabled={deleteDisabled}
                  deleteDisabledReason={deleteDisabledReason}
                  deleting={deleting}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
