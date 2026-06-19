"use client";

import Link from "next/link";
import { ExternalLink, Gamepad2, Plus, Trophy } from "lucide-react";
import { DashboardQuickLinks } from "@/components/dashboard/dashboard-quick-links";
import { DashboardWelcomeCard } from "@/components/dashboard/dashboard-welcome-card";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { ProfileCompletionSection } from "@/components/dashboard/profile-completion-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHostTournamentsList } from "@/hooks/use-host-tournaments";
import { adminRoutes, dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { userCanAccessAdmin } from "@/lib/roles/dashboard-links";
import { cn } from "@/lib/utils";

type HostDashboardProps = {
  userName: string;
  userEmail: string;
  userImageUrl?: string | null;
  roles: AppRole[];
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300",
  upcoming: "bg-blue-500/20 text-blue-300",
  live: "bg-emerald-500/20 text-emerald-300",
  completed: "bg-cp-muted/20 text-cp-muted",
  cancelled: "bg-red-500/20 text-red-300",
};

function TournamentTypeBadge({ tournamentType }: { tournamentType: string }) {
  const isOfficial = tournamentType === "official";
  return (
    <Badge
      className={cn(
        "gap-1 border-0 text-[10px] uppercase",
        isOfficial ? "bg-cp-primary/20 text-cp-primary" : "bg-emerald-500/20 text-emerald-300",
      )}
    >
      {isOfficial ? <Trophy className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}
      {isOfficial ? "Official" : "Reclub"}
    </Badge>
  );
}

function TournamentStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("gap-1.5 border-0 capitalize", STATUS_BADGE_STYLES[status])}>
      {status === "live" ? (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      ) : null}
      {status}
    </Badge>
  );
}

type HostOverviewTournament = {
  id: number;
  name: string;
  sportName: string;
  sportSlug: string;
  slug: string;
  status: string;
  tournamentType: string;
};

function HostOverviewTournamentRow({ tournament }: { tournament: HostOverviewTournament }) {
  const publicHref = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);

  return (
    <li className="group px-4 py-4 transition-colors hover:bg-cp-elevated/40 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link
          href={dashboardRoutes.hostTournament(tournament.id)}
          className="min-w-0 flex-1 rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-cp-primary/50"
        >
          <div className="flex flex-wrap items-center gap-2">
            <TournamentTypeBadge tournamentType={tournament.tournamentType} />
            <TournamentStatusBadge status={tournament.status} />
          </div>
          <p className="mt-2 font-semibold text-foreground transition-colors group-hover:text-cp-primary">
            {tournament.name}
          </p>
          <p className="mt-0.5 text-xs text-cp-muted">{tournament.sportName}</p>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 w-full gap-1.5 border-cp-border/80 bg-cp-elevated/30 text-foreground hover:border-cp-primary/40 hover:bg-cp-primary/10 hover:text-cp-primary sm:w-auto"
          >
            <Link href={publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              Public page
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

export function HostDashboard({ userName, userEmail, userImageUrl, roles }: HostDashboardProps) {
  const { data: tournaments = [], isLoading } = useHostTournamentsList();
  const recent = tournaments.slice(0, 5);
  const canOpenAdmin = userCanAccessAdmin(roles);

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="host"
      title="Overview"
      description="Manage official events, reclub sessions, registrations, and payouts."
      actions={
        <div className="grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 md:flex md:w-auto md:flex-wrap md:justify-end">
          <Button
            asChild
            className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light md:w-auto"
          >
            <Link href={`${dashboardRoutes.host}/tournaments/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create official
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 w-full border-emerald-500/40 text-emerald-300 md:w-auto"
          >
            <Link href={dashboardRoutes.tournamentsNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create reclub
            </Link>
          </Button>
        </div>
      }
    >
      <DashboardWelcomeCard
        displayName={userName}
        email={userEmail}
        imageUrl={userImageUrl}
        roles={roles}
        subtitle="Host workspace for tournaments and community events."
        className="cp-shadow-card"
      />

      <DashboardQuickLinks
        items={[
          {
            href: dashboardRoutes.hostTournaments,
            label: "My tournaments",
            description: "All events you host",
            icon: "trophy",
            accent: "primary",
          },
          {
            href: `${dashboardRoutes.host}/tournaments/new`,
            label: "Create official",
            description: "Paid ranked events",
            icon: "plus",
          },
          {
            href: dashboardRoutes.tournamentsNew,
            label: "Create reclub",
            description: "Free community play",
            icon: "gamepad2",
            accent: "emerald",
          },
          {
            href: dashboardRoutes.settings,
            label: "Settings",
            description: "Account & payout",
            icon: "settings",
          },
        ]}
      />

      <ProfileCompletionSection />

      <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Your tournaments</h2>
            <p className="text-sm text-cp-muted">
              {isLoading ? "Loading…" : `${tournaments.length} event${tournaments.length === 1 ? "" : "s"} you host`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-10 w-full shrink-0 border-cp-border sm:w-auto">
            <Link href={dashboardRoutes.hostTournaments}>View all</Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-cp-muted sm:px-6">Loading tournaments…</p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-6 sm:py-14">
            <Trophy className="h-10 w-10 text-cp-muted" />
            <p className="font-medium text-foreground">No tournaments yet</p>
            <p className="max-w-sm text-sm text-cp-muted">
              Official events require a host account. Reclub sessions are free community play.
            </p>
            <div className="mt-2 grid w-full max-w-xs grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <Button asChild size="sm" className="h-10 w-full bg-cp-primary">
                <Link href={`${dashboardRoutes.host}/tournaments/new`}>Create official</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-10 w-full border-emerald-500/40 text-emerald-300"
              >
                <Link href={dashboardRoutes.tournamentsNew}>Create reclub</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-cp-border">
            {recent.map((t) => (
              <HostOverviewTournamentRow key={t.id} tournament={t} />
            ))}
          </ul>
        )}
      </section>

      {canOpenAdmin ? (
        <div className="mt-6 rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-4 text-sm text-cp-muted sm:px-6">
          Need wiki or user management?{" "}
          <Link href={adminRoutes.home} className="font-medium text-cp-primary hover:underline">
            Open admin console
          </Link>
        </div>
      ) : null}
    </DashboardWorkspaceShell>
  );
}
