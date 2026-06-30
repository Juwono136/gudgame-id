"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  History,
  Plus,
  Trophy,
} from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { HostTournamentHistoryPanel } from "@/components/dashboard/host/host-tournament-history-panel";
import {
  HostTournamentIconActions,
  TournamentStatusBadge,
  TournamentTypeBadge,
} from "@/components/dashboard/host/host-tournament-ui";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useHostTournamentsList, useDeleteHostTournament } from "@/hooks/use-host-tournaments";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WorkspaceScopeTabs } from "@/components/dashboard/workspace-scope-tabs";

type HostTournamentsHubProps = {
  roles: AppRole[];
};

type HubTab = "events" | "history";

const TABS: { id: HubTab; label: string; hint: string; icon: typeof Trophy }[] = [
  {
    id: "events",
    label: "Active events",
    hint: "Manage upcoming and live tournaments",
    icon: Trophy,
  },
  {
    id: "history",
    label: "History & audit",
    hint: "Full records, brackets, scores, and snapshots",
    icon: History,
  },
];

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "live" | "upcoming";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "live"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : tone === "upcoming"
            ? "border-sky-500/25 bg-sky-500/5"
            : "border-cp-border bg-cp-card/60",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function HostTournamentCard({
  tournament,
  canEdit,
  onDelete,
}: {
  tournament: TournamentListItem;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const publicHref =
    tournament.sportSlug && tournament.slug
      ? publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug)
      : dashboardRoutes.hostTournament(tournament.id);

  return (
    <div className="group overflow-hidden rounded-2xl border border-cp-border bg-gradient-to-br from-cp-card/90 to-cp-elevated/20 transition-all hover:border-cp-primary/40 cp-shadow-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:p-5">
        <Link
          href={publicHref}
          className="min-w-0 flex-1 rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-cp-primary/50"
        >
          <div className="flex flex-wrap items-center gap-2">
            <TournamentTypeBadge tournamentType={tournament.tournamentType} />
            <TournamentStatusBadge status={tournament.status} />
          </div>
          <h2 className="mt-2 break-words text-base font-semibold text-foreground transition-colors group-hover:text-cp-primary sm:text-lg">
            {tournament.name}
          </h2>
          <p className="mt-1 text-sm text-cp-muted">
            {tournament.sportName}
            {tournament.venue ? ` · ${tournament.venue}` : ""}
          </p>
          {tournament.startsAt ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-cp-text-dim">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(tournament.startsAt))}
            </p>
          ) : null}
        </Link>

        <HostTournamentIconActions
          tournamentId={tournament.id}
          sportSlug={tournament.sportSlug}
          slug={tournament.slug}
          canEdit={canEdit}
          onEditDisabled={() =>
            toast.error("This tournament can't be edited", {
              description: "Completed or cancelled tournaments are locked for edits.",
            })
          }
          onDelete={onDelete}
          showWorkspaceLink
        />
      </div>

      <Link
        href={publicHref}
        className="flex items-center justify-between border-t border-cp-border/60 px-4 py-2.5 text-xs font-medium text-cp-primary transition-colors hover:bg-cp-elevated/40 sm:hidden"
      >
        Manage session
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function HostTournamentsHub({ roles }: HostTournamentsHubProps) {
  const { confirm } = useConfirmDialog();
  const [tab, setTab] = useState<HubTab>("events");
  const { sportSlug, availableSports } = useDashboardSport();
  const sportName = availableSports.find((s) => s.slug === sportSlug)?.name ?? sportSlug;
  const { data: items = [], isLoading, isError, error } = useHostTournamentsList();
  const deleteTournament = useDeleteHostTournament();

  const stats = useMemo(() => {
    const live = items.filter((t) => t.status === "live").length;
    const upcoming = items.filter((t) => t.status === "upcoming").length;
    const completed = items.filter((t) => t.status === "completed").length;
    return { total: items.length, live, upcoming, completed };
  }, [items]);

  const isEditableStatus = (status: string) =>
    status !== "completed" && status !== "cancelled";

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description:
        "This cannot be undone. Tournaments with paid registrations or active brackets cannot be deleted.",
      confirmLabel: "Delete tournament",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    deleteTournament.mutate(id);
  };

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="host"
      title="Tournaments"
      description={
        activeTab?.hint
          ? `${sportName} — ${activeTab.hint.toLowerCase()}`
          : `${sportName} — official and Fun Match events you host.`
      }
      breadcrumbs={[
        { label: "Host", href: dashboardRoutes.host },
        { label: "Tournaments" },
      ]}
      actions={
        tab === "events" ? (
          <Button
            asChild
            className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light md:w-auto"
          >
            <Link href={dashboardRoutes.hostTournamentsNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create tournament
            </Link>
          </Button>
        ) : null
      }
    >
      <LoadingOverlay show={deleteTournament.isPending} label="Deleting tournament…" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total events" value={stats.total} />
        <StatCard label="Live now" value={stats.live} tone="live" />
        <StatCard label="Upcoming" value={stats.upcoming} tone="upcoming" />
        <StatCard label="Completed" value={stats.completed} />
      </div>

      <WorkspaceScopeTabs
        className="mb-6"
        tabs={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          shortLabel: t.id === "events" ? "Active" : "History",
          hint: t.hint,
          icon: t.icon,
        }))}
        active={tab}
        onChange={setTab}
      />

      {tab === "history" ? <HostTournamentHistoryPanel /> : null}

      {tab === "events" ? (
        isLoading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <LoadingSpinner label="Loading tournaments…" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center text-sm text-red-300">
            {error instanceof Error ? error.message : "Failed to load"}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cp-border px-4 py-16 text-center sm:py-20">
            <Trophy className="mx-auto h-10 w-10 text-cp-muted" />
            <p className="mt-4 font-medium text-foreground">No events yet</p>
            <p className="mt-1 text-sm text-cp-muted">
              Create an official tournament or a free Fun Match to get started.
            </p>
            <Button asChild className="mt-6 h-10 bg-cp-primary">
              <Link href={dashboardRoutes.hostTournamentsNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create tournament
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {items.map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <HostTournamentCard
                  tournament={t}
                  canEdit={isEditableStatus(t.status)}
                  onDelete={() => void handleDelete(t.id, t.name)}
                />
              </motion.li>
            ))}
          </ul>
        )
      ) : null}
    </DashboardWorkspaceShell>
  );
}
