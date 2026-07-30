import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, ExternalLink, Settings, Trophy, Users } from "lucide-react";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerTournamentRow } from "@/components/partners/partner-tournament-row";
import { PageShell } from "@/components/layout/page-shell";
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
  title: "Partner Dashboard",
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

  return (
    <PageShell showGridBackground={false}>
      <div className={partnerPageClass("space-y-6 py-8")}>
        <PartnerPageHeader
          eyebrow="Partner workspace"
          title={
            <span className="flex items-center gap-2">
              <Building2 className="h-7 w-7 shrink-0 text-cp-primary" />
              <span className="truncate">{partner.displayName}</span>
            </span>
          }
          description={
            <>
              White-label site at{" "}
              <Link href={publicUrl} className="font-medium text-cp-primary hover:underline">
                /{partner.slug}
              </Link>
              . Use <span className="font-medium text-foreground">tournaments</span> for
              event-day brackets &amp; live scoring, and{" "}
              <span className="font-medium text-foreground">leagues</span> for season-long
              standings with manual scores — both stay off Gud Game rankings.
            </>
          }
          actions={
            <>
              <Button asChild variant="outline" className="border-cp-border">
                <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View site
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-cp-border">
                <Link href={dashboardRoutes.partnerSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Branding
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-cp-border">
                <Link href={partnerPublicRoutes.players(partner.slug)} target="_blank" rel="noopener noreferrer">
                  <Users className="mr-2 h-4 w-4" />
                  Player history
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-cp-border">
                <Link href={dashboardRoutes.partnerLeaguesNew}>
                  <Trophy className="mr-2 h-4 w-4" />
                  New league
                </Link>
              </Button>
              <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
                <Link href={dashboardRoutes.partnerTournamentsNew}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  New tournament
                </Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Tournaments", value: tournamentTotal },
            { label: "Leagues", value: leagueTotal },
            { label: "Live", value: liveCount },
            { label: "Upcoming", value: upcomingCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-cp-border bg-cp-card px-4 py-3.5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-cp-border px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Tournaments</h2>
              <p className="mt-0.5 text-xs text-cp-muted">
                One-day / weekend events — pools, knockout, live tablet scoring, TV display.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={dashboardRoutes.partnerTournaments}>View all</Link>
            </Button>
          </div>
          {tournaments.length === 0 ? (
            <PartnerEmptyState
              title="No tournaments yet"
              description="Create a knockout or group-stage event with live scoring on your white-label site only."
              action={
                <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
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

        <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-cp-border px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Leagues</h2>
              <p className="mt-0.5 text-xs text-cp-muted">
                Ongoing seasons — manual score entry, rolling standings, no live TV scoreboard.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={dashboardRoutes.partnerLeagues}>View all</Link>
            </Button>
          </div>
          {leagues.length === 0 ? (
            <PartnerEmptyState
              title="No leagues yet"
              description="Partner-only feature: run a multi-week league with teams and standings updated as you enter scores."
              action={
                <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
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
                    <span className="shrink-0 text-xs font-medium text-cp-primary">Manage</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
