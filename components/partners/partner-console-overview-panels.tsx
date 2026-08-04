"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Plus,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import type { PartnerLeagueListItem } from "@/lib/partners/league-types";
import { getTournamentFormatLabel } from "@/lib/tournaments/settings";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

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

function ConsolePanel({
  title,
  description,
  viewAllHref,
  children,
}: {
  title: string;
  description: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-cp-border/80 bg-cp-elevated/20 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 truncate text-xs text-cp-muted">{description}</p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 shrink-0 border-cp-border bg-cp-card px-2.5 text-xs"
        >
          <Link href={viewAllHref}>
            View all
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
      {children}
    </section>
  );
}

function ConsoleEmpty({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-7">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cp-border bg-cp-elevated/50 text-cp-primary">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-cp-muted sm:text-sm">{description}</p>
        </div>
      </div>
      <Button asChild size="sm" className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto">
        <Link href={actionHref}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {actionLabel}
        </Link>
      </Button>
    </div>
  );
}

function ConsoleTournamentItem({
  tournament,
  partnerSlug,
}: {
  tournament: TournamentListItem;
  partnerSlug: string;
}) {
  const manageHref = partnerPublicRoutes.tournamentManage(partnerSlug, tournament.slug);
  const paid = isPaidEntry(tournament);
  const fee = formatIdr(tournament.registrationFeeIdr);
  const formatLabel = getTournamentFormatLabel(tournament.format);

  return (
    <li>
      <Link
        href={manageHref}
        className="group block px-4 py-3.5 transition-colors hover:bg-cp-elevated/35 sm:px-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground group-hover:text-cp-primary">
                {tournament.name}
              </p>
              <PartnerStatusBadge status={tournament.status} />
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cp-muted">
              {tournament.venue ? (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{tournament.venue}</span>
                </span>
              ) : (
                <span>{formatLabel}</span>
              )}
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

          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-cp-border bg-cp-card px-2.5 py-1 text-xs font-semibold text-cp-primary transition-colors group-hover:border-cp-primary/40 group-hover:bg-cp-primary/10">
            Manage
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

function ConsoleLeagueItem({ league }: { league: PartnerLeagueListItem }) {
  return (
    <li>
      <Link
        href={dashboardRoutes.partnerLeague(league.id)}
        className="group block px-4 py-3.5 transition-colors hover:bg-cp-elevated/35 sm:px-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground group-hover:text-cp-primary">
                {league.name}
              </p>
              <PartnerStatusBadge status={league.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge className="border-cp-border bg-cp-elevated/70 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                <Users className="mr-1 h-3 w-3" aria-hidden />
                {league.teamCount} teams
              </Badge>
              <Badge className="border-cp-border bg-cp-elevated/70 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                <Trophy className="mr-1 h-3 w-3" aria-hidden />
                {league.matchCount} matches
              </Badge>
            </div>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-cp-border bg-cp-card px-2.5 py-1 text-xs font-semibold text-cp-primary transition-colors group-hover:border-cp-primary/40 group-hover:bg-cp-primary/10">
            Manage
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

export function PartnerConsoleOverviewPanels({
  partnerSlug,
  tournaments,
  leagues,
}: {
  partnerSlug: string;
  tournaments: TournamentListItem[];
  leagues: PartnerLeagueListItem[];
}) {
  return (
    <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
      <ConsolePanel
        title="Tournaments"
        description="Brackets, scoring, and guest curation"
        viewAllHref={dashboardRoutes.partnerTournaments}
      >
        {tournaments.length === 0 ? (
          <ConsoleEmpty
            title="No tournaments yet"
            description="Create an event to open registration and scoring."
            actionHref={dashboardRoutes.partnerTournamentsNew}
            actionLabel="Create tournament"
          />
        ) : (
          <ul className="divide-y divide-cp-border">
            {tournaments.map((t) => (
              <ConsoleTournamentItem key={t.id} tournament={t} partnerSlug={partnerSlug} />
            ))}
          </ul>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="Leagues"
        description="Season standings on your site"
        viewAllHref={dashboardRoutes.partnerLeagues}
      >
        {leagues.length === 0 ? (
          <ConsoleEmpty
            title="No leagues yet"
            description="Add a season when you need ongoing standings."
            actionHref={dashboardRoutes.partnerLeaguesNew}
            actionLabel="Create league"
          />
        ) : (
          <ul className="divide-y divide-cp-border">
            {leagues.map((league) => (
              <ConsoleLeagueItem key={league.id} league={league} />
            ))}
          </ul>
        )}
      </ConsolePanel>
    </div>
  );
}
