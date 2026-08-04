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
import { PartnerConsoleOverviewPanels } from "@/components/partners/partner-console-overview-panels";
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
import { cn } from "@/lib/utils";
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

  const shortcuts = [
    { href: dashboardRoutes.partnerPayments, label: "Payments", icon: Receipt },
    { href: dashboardRoutes.partnerSettings, label: "Branding", icon: Settings },
    { href: dashboardRoutes.partnerTournaments, label: "All tournaments", icon: CalendarDays },
    { href: dashboardRoutes.partnerLeagues, label: "All leagues", icon: Trophy },
  ];

  return (
    <div className={partnerPageClass("min-w-0 space-y-6 py-6 sm:space-y-8 sm:py-10")}>
      <FadeInView>
        <section
          className="relative overflow-hidden rounded-2xl border border-cp-border/80 bg-cp-card shadow-sm sm:rounded-[1.75rem]"
          style={{
            background: `linear-gradient(135deg, ${primary}18 0%, transparent 52%), var(--cp-card)`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-35 blur-3xl"
            style={{ background: primary }}
            aria-hidden
          />

          <div className="relative grid gap-6 px-4 py-6 sm:gap-7 sm:px-7 sm:py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
            <div className="min-w-0 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cp-muted">
                Partner console
              </p>
              <h1 className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {partner.displayName}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-cp-muted">
                Run tournaments, leagues, and player lists.
              </p>
              <Link
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border/80 bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-cp-primary/40 hover:text-cp-primary sm:text-sm"
              >
                <span className="text-cp-muted">Site</span>
                <span className="font-semibold">/{partner.slug}</span>
                <ExternalLink className="h-3.5 w-3.5 text-cp-primary" aria-hidden />
              </Link>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[17.5rem]">
              <Button
                asChild
                className="h-11 w-full justify-center bg-cp-primary hover:bg-cp-primary-light"
              >
                <Link href={dashboardRoutes.partnerTournamentsNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  New tournament
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 justify-center border-cp-border bg-background/75"
                >
                  <Link href={dashboardRoutes.partnerLeaguesNew}>
                    <Trophy className="mr-1.5 h-4 w-4" />
                    New league
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 justify-center border-cp-border bg-background/75"
                >
                  <Link href={partnerPublicRoutes.players(partner.slug)}>
                    <Users className="mr-1.5 h-4 w-4" />
                    Players
                  </Link>
                </Button>
              </div>
              <Button
                asChild
                variant="ghost"
                className="h-9 justify-center text-cp-muted hover:bg-cp-elevated/70 hover:text-foreground"
              >
                <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                  Open public site
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </FadeInView>

      <section aria-label="Workspace stats">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <FadeInView key={stat.label} delay={i * 0.04}>
              <Link
                href={stat.href}
                className="group flex min-h-[6.75rem] flex-col justify-between rounded-2xl border border-cp-border bg-cp-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cp-primary/35 hover:shadow-md sm:min-h-[7.5rem] sm:p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cp-muted sm:text-[11px]">
                    {stat.label}
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cp-primary/10 text-cp-primary transition-colors group-hover:bg-cp-primary/15">
                    <stat.icon className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {stat.value}
                </p>
              </Link>
            </FadeInView>
          ))}
        </div>
      </section>

      <section
        aria-label="Quick links"
        className="rounded-2xl border border-cp-border/80 bg-cp-elevated/25 p-2 sm:p-2.5"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-transparent",
                "bg-cp-card px-3 text-sm font-medium text-foreground shadow-sm",
                "transition-colors hover:border-cp-primary/30 hover:text-cp-primary",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-cp-primary" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <FadeInView>
        <PartnerConsoleOverviewPanels
          partnerSlug={partner.slug}
          tournaments={tournaments}
          leagues={leagues}
        />
      </FadeInView>
    </div>
  );
}
