import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  Receipt,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerTournamentRow } from "@/components/partners/partner-tournament-row";
import { Button } from "@/components/ui/button";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import {
  countPartnerLeagues,
  listPartnerLeagueTeasers,
} from "@/lib/partners/leagues";
import { partnerPageClass } from "@/lib/partners/layout";
import { requirePartnerWorkspace } from "@/lib/partners/session";
import {
  countPartnerTournaments,
  listPartnerTournamentTeasers,
} from "@/lib/partners/tournaments";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Console",
};

export default async function PartnerDashboardPage() {
  let workspace;
  try {
    workspace = await requirePartnerWorkspace();
  } catch {
    redirect(`${dashboardRoutes.home}?error=partner_not_provisioned`);
  }

  const { partner } = workspace;
  const [tournaments, leagues, tournamentTotal, leagueTotal, liveCount, upcomingCount] =
    await Promise.all([
      listPartnerTournamentTeasers(partner.id, { limit: 8, status: "all" }),
      listPartnerLeagueTeasers(partner.id, { limit: 6 }),
      countPartnerTournaments(partner.id, "all"),
      countPartnerLeagues(partner.id, "all"),
      countPartnerTournaments(partner.id, "live"),
      countPartnerTournaments(partner.id, "upcoming"),
    ]);
  const publicUrl = partnerPublicRoutes.home(partner.slug);

  const actionBtn =
    "h-10 w-full justify-center sm:h-9 sm:w-auto sm:justify-start";

  return (
    <div className={partnerPageClass("min-w-0 space-y-6 py-6 sm:space-y-8 sm:py-10")}>
      <PartnerPageHeader
        eyebrow="Partner console"
        title={partner.displayName}
        description={
          <>
            Site:{" "}
            <Link href={publicUrl} className="font-medium text-cp-primary hover:underline">
              /{partner.slug}
            </Link>
          </>
        }
        actionsPlacement="below"
        actions={
          <>
            <Button
              asChild
              className={`col-span-2 bg-cp-primary hover:bg-cp-primary-light sm:col-span-1 ${actionBtn}`}
            >
              <Link href={dashboardRoutes.partnerTournamentsNew}>
                <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                New tournament
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={`border-cp-border bg-cp-card/70 ${actionBtn}`}
            >
              <Link href={dashboardRoutes.partnerLeaguesNew}>
                <Trophy className="mr-2 h-4 w-4 shrink-0" />
                New league
              </Link>
            </Button>
            <span
              className="mx-0.5 hidden h-6 w-px self-center bg-cp-border sm:inline-block"
              aria-hidden
            />
            <Button
              asChild
              variant="outline"
              className={`border-cp-border bg-cp-card/70 ${actionBtn}`}
            >
              <Link href={dashboardRoutes.partnerPayments}>
                <Receipt className="mr-2 h-4 w-4 shrink-0" />
                Payments
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={`border-cp-border bg-cp-card/70 ${actionBtn}`}
            >
              <Link href={dashboardRoutes.partnerSettings}>
                <Settings className="mr-2 h-4 w-4 shrink-0" />
                Branding
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={`border-cp-border bg-cp-card/70 ${actionBtn}`}
            >
              <Link
                href={partnerPublicRoutes.players(partner.slug)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Users className="mr-2 h-4 w-4 shrink-0" />
                Players
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className={`text-cp-muted hover:text-foreground sm:col-auto ${actionBtn}`}
            >
              <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
                Open site
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {[
          { label: "Tournaments", value: tournamentTotal, href: dashboardRoutes.partnerTournaments },
          { label: "Leagues", value: leagueTotal, href: dashboardRoutes.partnerLeagues },
          { label: "Live now", value: liveCount, href: dashboardRoutes.partnerTournaments },
          { label: "Upcoming", value: upcomingCount, href: dashboardRoutes.partnerTournaments },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group min-w-0 rounded-2xl border border-cp-border bg-cp-card/80 px-3 py-3.5 transition-colors hover:border-cp-primary/35 hover:bg-cp-elevated/40 sm:px-4 sm:py-4"
          >
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-cp-muted sm:text-[11px]">
              {stat.label}
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-card/90 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-cp-border px-4 py-3.5 sm:items-center sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Tournaments</h2>
              <p className="mt-0.5 text-xs text-cp-muted">Brackets and live scoring</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0 px-2 sm:px-3">
              <Link href={dashboardRoutes.partnerTournaments}>View all</Link>
            </Button>
          </div>
          {tournaments.length === 0 ? (
            <PartnerEmptyState
              title="No tournaments yet"
              description="Create an event to open registration and scoring."
              action={
                <Button asChild className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto">
                  <Link href={dashboardRoutes.partnerTournamentsNew}>Create tournament</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-cp-border">
              {tournaments.map((t) => (
                <PartnerTournamentRow
                  key={t.id}
                  tournament={t}
                  href={partnerPublicRoutes.tournamentManage(partner.slug, t.slug)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-card/90 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-cp-border px-4 py-3.5 sm:items-center sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Leagues</h2>
              <p className="mt-0.5 text-xs text-cp-muted">Season standings</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0 px-2 sm:px-3">
              <Link href={dashboardRoutes.partnerLeagues}>View all</Link>
            </Button>
          </div>
          {leagues.length === 0 ? (
            <PartnerEmptyState
              title="No leagues yet"
              description="Add a season when you need ongoing standings."
              action={
                <Button asChild className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto">
                  <Link href={dashboardRoutes.partnerLeaguesNew}>Create league</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-cp-border">
              {leagues.map((league) => (
                <li key={league.id}>
                  <Link
                    href={dashboardRoutes.partnerLeague(league.id)}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-cp-elevated/40 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{league.name}</p>
                      <p className="mt-0.5 text-xs text-cp-muted">
                        {league.teamCount} teams · {league.matchCount} matches
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-cp-primary">Open</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
