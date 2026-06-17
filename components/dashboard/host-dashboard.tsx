"use client";

import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { DashboardQuickLinks } from "@/components/dashboard/dashboard-quick-links";
import { DashboardWelcomeCard } from "@/components/dashboard/dashboard-welcome-card";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { ProfileCompletionSection } from "@/components/dashboard/profile-completion-section";
import { Button } from "@/components/ui/button";
import { useHostTournamentsList } from "@/hooks/use-host-tournaments";
import { adminRoutes, dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { userCanAccessAdmin } from "@/lib/roles/dashboard-links";
import { cn } from "@/lib/utils";

type HostDashboardProps = {
  userName: string;
  userEmail: string;
  roles: AppRole[];
};

const STATUS_COLORS: Record<string, string> = {
  draft: "text-slate-300",
  upcoming: "text-blue-300",
  live: "text-emerald-300",
  completed: "text-cp-muted",
  cancelled: "text-red-300",
};

export function HostDashboard({ userName, userEmail, roles }: HostDashboardProps) {
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
        <div className="hidden gap-2 md:flex md:flex-wrap md:justify-end">
          <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
            <Link href={`${dashboardRoutes.host}/tournaments/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create official
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-emerald-500/40 text-emerald-300">
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
        roles={roles}
        subtitle="Host workspace for tournaments and community events."
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

      <section className="mt-6 rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your tournaments</h2>
            <p className="text-sm text-cp-muted">
              {isLoading ? "Loading…" : `${tournaments.length} event${tournaments.length === 1 ? "" : "s"} you host`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-cp-border">
            <Link href={dashboardRoutes.hostTournaments}>View all</Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="px-6 py-12 text-center text-sm text-cp-muted">Loading tournaments…</p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Trophy className="h-10 w-10 text-cp-muted" />
            <p className="font-medium text-foreground">No tournaments yet</p>
            <p className="max-w-sm text-sm text-cp-muted">
              Official events require a host account. Reclub sessions are free community play.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link href={`${dashboardRoutes.host}/tournaments/new`}>Create your first tournament</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-cp-border">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-cp-elevated/40 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <Link href={dashboardRoutes.hostTournament(t.id)} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground hover:text-cp-primary">
                    {t.name}
                  </p>
                  <p className="text-xs text-cp-muted">
                    {t.sportName} · {t.tournamentType === "official" ? "Official" : "Reclub"}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={cn("text-xs font-semibold capitalize", STATUS_COLORS[t.status])}>
                    {t.status}
                  </span>
                  <Button asChild variant="ghost" size="sm" className="h-8 text-cp-primary">
                    <Link
                      href={publicSportRoutes.tournament(t.sportSlug, t.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Public page
                    </Link>
                  </Button>
                </div>
              </li>
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
