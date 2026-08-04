"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Ticket, Trophy, Users } from "lucide-react";
import { DiscoveryCardSummary } from "@/components/tournaments/discovery-card-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicTournamentTypeLabel } from "@/lib/tournaments/constants";
import type { TournamentDiscoveryCta } from "@/lib/tournaments/discovery-cta";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { getTournamentFormatLabel } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";

const STATUS_OVERLAY: Record<string, string> = {
  live: "bg-red-600 text-white",
  upcoming: "bg-slate-900/85 text-white dark:bg-slate-100 dark:text-slate-900",
  completed: "bg-cp-elevated/95 text-foreground",
  cancelled: "bg-cp-elevated/95 text-cp-muted",
  draft: "bg-amber-500/90 text-white",
};

function formatDateRange(starts: string | null, ends: string | null) {
  if (!starts) return "Date TBA";
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

export type TournamentDiscoveryCardProps = {
  tournament: TournamentListItem;
  /** Detail / manage page (title + cover link). */
  href: string;
  /** Public CTA (Join / Bracket). Ignored when `actions` is set. */
  cta?: TournamentDiscoveryCta;
  /** Dashboard action strip (Manage + secondary). */
  actions?: React.ReactNode;
  /** Eager-load cover when this card is above the fold (LCP). */
  priority?: boolean;
  className?: string;
};

function isPaidEntry(tournament: TournamentListItem): boolean {
  if (tournament.officialBilling === "paid") return true;
  if (tournament.officialBilling === "free") return false;
  return (tournament.registrationFeeIdr ?? 0) > 0;
}

export function TournamentDiscoveryCard({
  tournament,
  href,
  cta,
  actions,
  priority = false,
  className,
}: TournamentDiscoveryCardProps) {
  const prize = formatIdr(tournament.prizePoolIdr);
  const fee = formatIdr(tournament.registrationFeeIdr);
  const paid = isPaidEntry(tournament);
  const formatLabel = getTournamentFormatLabel(tournament.format);
  const statusKey = tournament.status in STATUS_OVERLAY ? tournament.status : "upcoming";
  const cover = tournament.coverImageUrl?.trim() || null;
  const ctaHref = cta?.href ?? href;
  const ctaLabel = cta?.label ?? "Open";
  const ctaPrimary = (cta?.emphasis ?? "secondary") === "primary";

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-cp-primary/40 hover:shadow-md",
        className,
      )}
    >
      <Link href={href} className="relative block aspect-[16/10] w-full overflow-hidden bg-cp-elevated">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cp-primary/25 via-cp-elevated to-cp-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
        <Badge
          className={cn(
            "absolute left-3 top-3 border-0 text-[10px] font-bold uppercase tracking-wider",
            STATUS_OVERLAY[statusKey],
          )}
        >
          {tournament.status === "live" ? (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          ) : null}
          {tournament.status.replaceAll("_", " ")}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge className="max-w-[60%] truncate border-cp-border bg-cp-elevated/60 text-[10px] font-semibold uppercase text-cp-muted">
            {tournament.categoryLabel?.trim() ||
              getPublicTournamentTypeLabel(tournament.tournamentType)}
          </Badge>
          {tournament.venue ? (
            <span className="inline-flex min-w-0 max-w-[40%] items-center gap-1 text-[11px] text-cp-muted">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{tournament.venue}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-cp-muted">
              <Users className="h-3 w-3 shrink-0" aria-hidden />
              {getPublicTournamentTypeLabel(tournament.tournamentType)}
            </span>
          )}
        </div>

        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-cp-primary sm:text-lg">
            {tournament.name}
          </h3>
        </Link>

        <DiscoveryCardSummary
          html={tournament.summary?.trim() || tournament.description}
        />

        <p className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatDateRange(tournament.startsAt, tournament.endsAt)}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
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
        </div>

        <div className="mt-auto space-y-3 border-t border-cp-border/70 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {prize ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cp-muted">
                    Prize pool
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-base font-bold tabular-nums text-cp-primary sm:text-lg">
                    <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                    {prize}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cp-muted">
                    Entry
                  </p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-cp-primary sm:text-lg">
                    {paid ? fee ?? "Paid" : "Free"}
                  </p>
                </>
              )}
            </div>

            {!actions ? (
              <Button
                asChild
                size="sm"
                className={cn(
                  "shrink-0 rounded-full px-4",
                  ctaPrimary
                    ? "bg-cp-primary hover:bg-cp-primary-light"
                    : "border-cp-border bg-cp-elevated text-foreground hover:bg-cp-elevated/80",
                )}
                variant={ctaPrimary ? "default" : "outline"}
              >
                <Link href={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>

          {actions ? <div className="w-full">{actions}</div> : null}
        </div>
      </div>
    </article>
  );
}
