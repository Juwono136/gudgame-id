"use client";

import Link from "next/link";
import { ExternalLink, Gamepad2, Plus, Trophy, UserRound } from "lucide-react";
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
import {
  getTournamentStatusBadgeClass,
  getTournamentTypeBadgeClass,
  tournamentStatusBadgeClass,
} from "@/lib/styles/status-badges";
import { SportInterestsDisplay } from "@/components/shared/sport-interests-display";
import type { SportInterestItem } from "@/lib/account/player-performance/sport-interests";
import type { ProfileCompletionSnapshot } from "@/lib/auth/profile-completion-shared";
import { cn } from "@/lib/utils";

type HostDashboardProps = {
  userName: string;
  userEmail: string;
  userImageUrl?: string | null;
  roles: AppRole[];
  publicPageUrl?: string | null;
  sportInterests?: SportInterestItem[];
  profileCompletion?: ProfileCompletionSnapshot;
};

const STATUS_BADGE_STYLES = tournamentStatusBadgeClass;

function TournamentTypeBadge({ tournamentType }: { tournamentType: string }) {
  const isOfficial = tournamentType === "official";
  return (
    <Badge className={cn("gap-1 border-0 text-[10px] uppercase", getTournamentTypeBadgeClass(tournamentType))}>
      {isOfficial ? <Trophy className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}
      {isOfficial ? "Official" : "Fun Match"}
    </Badge>
  );
}

function TournamentStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("gap-1.5 border-0 capitalize", STATUS_BADGE_STYLES[status] ?? getTournamentStatusBadgeClass(status))}>
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
  id: string;
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
          href={`${publicHref}?manage=1`}
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

export function HostDashboard({
  userName,
  userEmail,
  userImageUrl,
  roles,
  publicPageUrl,
  sportInterests = [],
  profileCompletion,
}: HostDashboardProps) {
  const { data: tournaments = [], isLoading } = useHostTournamentsList();
  const recent = tournaments.slice(0, 5);
  const canOpenAdmin = userCanAccessAdmin(roles);

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="host"
      title="Overview"
      description="Manage official events, Fun Match sessions, registrations, and payouts."
      actions={
        <div className="flex w-full flex-col gap-2 min-[400px]:flex-row md:w-auto">
          {publicPageUrl ? (
            <Button
              asChild
              variant="outline"
              className="h-10 w-full border-cp-border md:w-auto"
            >
              <Link href={publicPageUrl} target="_blank" rel="noopener noreferrer">
                <UserRound className="mr-2 h-4 w-4" />
                Public profile
              </Link>
            </Button>
          ) : null}
          <Button
            asChild
            className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light md:w-auto"
          >
            <Link href={dashboardRoutes.hostTournamentsNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create tournament
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

      {sportInterests.length > 0 ? (
        <div className="rounded-2xl border border-cp-border bg-cp-card/60 px-4 py-3 sm:px-5 sm:py-4">
          <SportInterestsDisplay
            items={sportInterests}
            title="Sports you follow"
            description="Shown on your public player profile"
          />
        </div>
      ) : null}

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
            href: dashboardRoutes.hostTournamentsNew,
            label: "Create tournament",
            description: "Official or Fun Match",
            icon: "plus",
          },
          {
            href: dashboardRoutes.hostPayments,
            label: "Payments & payout",
            description: "Registrations and earnings",
            icon: "creditCard",
          },
          {
            href: dashboardRoutes.hostSettings,
            label: "Settings",
            description: "Account & payout details",
            icon: "settings",
          },
        ]}
      />

      <ProfileCompletionSection snapshot={profileCompletion} />

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
              Create your first official event or Fun Match session — choose the format when you start.
            </p>
            <Button asChild size="sm" className="mt-2 h-10 bg-cp-primary">
              <Link href={dashboardRoutes.hostTournamentsNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create tournament
              </Link>
            </Button>
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
