"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Gamepad2, Plus, Trophy } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { HostPayoutSetupCard } from "@/components/dashboard/host/host-payout-setup-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useHostTournamentsList } from "@/hooks/use-host-tournaments";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300",
  upcoming: "bg-blue-500/20 text-blue-300",
  live: "bg-emerald-500/20 text-emerald-300",
  completed: "bg-cp-muted/20 text-cp-muted",
  cancelled: "bg-red-500/20 text-red-300",
};

type HostTournamentsHubProps = {
  roles: AppRole[];
};

export function HostTournamentsHub({ roles }: HostTournamentsHubProps) {
  const { data: items = [], isLoading, isError, error } = useHostTournamentsList();

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="host"
      title="My tournaments"
      description="Official paid events and reclub community sessions you host."
      breadcrumbs={[
        { label: "Host", href: dashboardRoutes.host },
        { label: "Tournaments" },
      ]}
      actions={
        <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
          <Link href={`${dashboardRoutes.host}/tournaments/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create tournament
          </Link>
        </Button>
      }
    >
      <HostPayoutSetupCard />

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <LoadingSpinner label="Loading tournaments…" />
        </div>
      ) : isError ? (
        <div className="mt-12 rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center text-sm text-red-300">
          {error instanceof Error ? error.message : "Failed to load"}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-cp-border py-20 text-center">
          <Trophy className="mx-auto h-10 w-10 text-cp-muted" />
          <p className="mt-4 font-medium text-foreground">No tournaments yet</p>
          <p className="mt-1 text-sm text-cp-muted">
            Create an official ranked event or a free reclub session.
          </p>
          <Button asChild className="mt-6">
            <Link href={`${dashboardRoutes.host}/tournaments/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first tournament
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((t, i) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="group flex flex-col gap-3 rounded-2xl border border-cp-border bg-cp-card/70 p-5 transition-colors hover:border-cp-primary/40 hover:bg-cp-card sm:flex-row sm:items-center sm:justify-between">
                <Link href={dashboardRoutes.hostTournament(t.id)} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.tournamentType === "official" ? (
                      <Badge className="border-0 bg-cp-primary/20 text-cp-primary">
                        <Trophy className="mr-1 h-3 w-3" />
                        Official
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-emerald-500/20 text-emerald-300">
                        <Gamepad2 className="mr-1 h-3 w-3" />
                        Reclub
                      </Badge>
                    )}
                    <Badge className={cn("border-0 capitalize", STATUS_COLORS[t.status])}>
                      {t.status}
                    </Badge>
                  </div>
                  <h2 className="mt-2 truncate text-lg font-semibold text-foreground group-hover:text-cp-primary">
                    {t.name}
                  </h2>
                  <p className="mt-1 text-sm text-cp-muted">
                    {t.sportName}
                    {t.venue ? ` · ${t.venue}` : ""}
                  </p>
                  {t.startsAt ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-cp-text-dim">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(t.startsAt))}
                    </p>
                  ) : null}
                </Link>
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline" size="sm" className="border-cp-border">
                    <Link
                      href={publicSportRoutes.tournament(t.sportSlug, t.slug)}
                      target="_blank"
                    >
                      Public page
                    </Link>
                  </Button>
                  <Link href={dashboardRoutes.hostTournament(t.id)}>
                    <ChevronRight className="h-5 w-5 text-cp-muted transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </DashboardWorkspaceShell>
  );
}
