"use client";

import Link from "next/link";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { htmlExcerpt } from "@/lib/html/strip-html";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { getPublicTournamentTypeLabel } from "@/lib/tournaments/constants";
import { getTournamentTypeBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  upcoming: "bg-sky-900/40 text-sky-200",
  live: "bg-red-900/50 text-red-200",
  completed: "bg-cp-elevated text-cp-muted",
  cancelled: "bg-cp-elevated text-cp-muted",
  draft: "bg-cp-elevated text-cp-muted",
} as const;

function formatDate(starts: string | null, ends: string | null) {
  if (!starts) return "TBA";
  const start = new Date(starts);
  const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
  if (!ends) return fmt.format(start);
  const end = new Date(ends);
  if (start.toDateString() === end.toDateString()) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatIdr(amount: number | null | undefined) {
  if (amount == null) return "Free";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type PublicTournamentsTableProps = {
  sportSlug: string;
  items: TournamentListItem[];
};

export function PublicTournamentsTable({ sportSlug, items }: PublicTournamentsTableProps) {
  return (
    <div className="divide-y divide-cp-border">
      {items.map((tournament) => {
        const excerpt = htmlExcerpt(tournament.summary, 90);
        const href = publicSportRoutes.tournament(sportSlug, tournament.slug);

        return (
          <Link
            key={tournament.id}
            href={href}
            className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-cp-elevated/30 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "border-0 text-[10px] font-semibold uppercase",
                    STATUS_STYLES[tournament.status],
                  )}
                >
                  {tournament.status}
                </Badge>
                <Badge
                  className={cn(
                    "border text-[10px] font-medium",
                    getTournamentTypeBadgeClass(tournament.tournamentType),
                  )}
                >
                  {getPublicTournamentTypeLabel(tournament.tournamentType)}
                </Badge>
                {tournament.categoryLabel ? (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-cp-muted">
                    {tournament.categoryLabel}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 truncate text-base font-semibold text-foreground group-hover:text-cp-primary sm:text-lg">
                {tournament.name}
              </h3>
              {excerpt ? (
                <p className="mt-1 line-clamp-1 text-sm text-cp-muted">{excerpt}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cp-muted sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(tournament.startsAt, tournament.endsAt)}
                </span>
                {tournament.venue ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tournament.venue}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
              <span
                className={cn(
                  "text-sm font-semibold",
                  tournament.registrationFeeIdr ? "text-foreground" : "text-cp-muted",
                )}
              >
                {formatIdr(tournament.registrationFeeIdr)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-cp-primary opacity-80 transition-opacity group-hover:opacity-100">
                View
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
