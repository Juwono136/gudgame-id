import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
  Plus,
  Radio,
  Receipt,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
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
  const primary = partner.branding.primaryColor ?? "#0d9488";

  const stats = [
    {
      label: "Tournaments",
      value: tournamentTotal,
      href: dashboardRoutes.partnerTournaments,
      icon: CalendarDays,
    },
    {
      label: "Leagues",
      value: leagueTotal,
      href: dashboardRoutes.partnerLeagues,
      icon: Trophy,
    },
    {
      label: "Live now",
      value: liveCount,
      href: `${dashboardRoutes.partnerTournaments}?status=live`,
      icon: Radio,
    },
    {
      label: "Upcoming",
      value: upcomingCount,
      href: `${dashboardRoutes.partnerTournaments}?status=upcoming`,
      icon: CalendarDays,
    },
  ];

  return (
    <div className={partnerPageClass("min-w-0 space-y-6 py-6 sm:space-y-8 sm:py-10")}>
      <FadeInView>
        <section
          className="relative overflow-hidden rounded-2xl border border-cp-border/80 bg-cp-card shadow-sm sm:rounded-[1.75rem]"
          style={{
            background: `linear-gradient(135deg, ${primary}18 0%, transparent 48%), var(--cp-card)`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
            style={{ background: primary }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 px-4 py-6 sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cp-muted">
                Partner console
              </p>
              <h1 className="mt-1.5 break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {partner.displayName}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-cp-muted">
                Run events, leagues, and guest registration on your white-label site — separate from
                Gud Game rankings.
              </p>
              <Link
                href={publicUrl}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cp-primary hover:underline"
              >
                Site: /{partner.slug}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <Button asChild className="col-span-2 bg-cp-primary hover:bg-cp-primary-light sm:col-span-1">
                <Link href={dashboardRoutes.partnerTournamentsNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  New tournament
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-cp-border bg-background/70">
                <Link href={dashboardRoutes.partnerLeaguesNew}>
                  <Trophy className="mr-2 h-4 w-4" />
                  New league
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-cp-border bg-background/70">
                <Link href={partnerPublicRoutes.players(partner.slug)}>
                  <Users className="mr-2 h-4 w-4" />
                  Players
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-cp-muted hover:text-foreground">
                <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open site
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </FadeInView>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <FadeInView key={stat.label} delay={i * 0.04}>
            <Link
              href={stat.href}
              className="group flex min-h-[6.5rem] flex-col justify-between rounded-2xl border border-cp-border bg-cp-card/90 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cp-primary/40 hover:shadow-md sm:min-h-[7.25rem] sm:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-cp-muted sm:text-[11px]">
                  {stat.label}
                </p>
                <stat.icon
                  className="h-4 w-4 shrink-0 text-cp-primary opacity-80 transition group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                {stat.value}
              </p>
            </Link>
          </FadeInView>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { href: dashboardRoutes.partnerPayments, label: "Payments", icon: Receipt },
          { href: dashboardRoutes.partnerSettings, label: "Branding", icon: Settings },
          { href: dashboardRoutes.partnerTournaments, label: "All tournaments", icon: CalendarDays },
          { href: dashboardRoutes.partnerLeagues, label: "All leagues", icon: Trophy },
        ].map((item) => (
          <Button
            key={item.href}
            asChild
            variant="outline"
            size="sm"
            className="border-cp-border bg-cp-card/70"
          >
            <Link href={item.href}>
              <item.icon className="mr-1.5 h-3.5 w-3.5" />
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <FadeInView className="min-w-0">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-card/95 shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-cp-border bg-cp-elevated/30 px-4 py-3.5 sm:items-center sm:px-5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Tournaments</h2>
                <p className="mt-0.5 text-xs text-cp-muted">Brackets, scoring, and guest curation</p>
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
        </FadeInView>

        <FadeInView className="min-w-0" delay={0.05}>
          <section className="min-w-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-card/95 shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-cp-border bg-cp-elevated/30 px-4 py-3.5 sm:items-center sm:px-5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Leagues</h2>
                <p className="mt-0.5 text-xs text-cp-muted">Season standings on your site</p>
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
        </FadeInView>
      </div>
    </div>
  );
}
