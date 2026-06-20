"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Plus, Trophy } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import {
  HostTournamentIconActions,
  TournamentStatusBadge,
  TournamentTypeBadge,
} from "@/components/dashboard/host/host-tournament-ui";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useHostTournamentsList, useDeleteHostTournament } from "@/hooks/use-host-tournaments";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { toast } from "sonner";

type HostTournamentsHubProps = {
  roles: AppRole[];
};

function HostTournamentCard({
  tournament,
  canEdit,
  onDelete,
}: {
  tournament: TournamentListItem;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const workspaceHref = dashboardRoutes.hostTournament(tournament.id);

  return (
    <div className="group overflow-hidden rounded-2xl border border-cp-border bg-cp-card/70 transition-colors hover:border-cp-primary/40 hover:bg-cp-card cp-shadow-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:p-5">
        <Link
          href={workspaceHref}
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
            toast.error("This tournament can’t be edited", {
              description: "Completed or cancelled tournaments are locked for edits.",
            })
          }
          onDelete={onDelete}
          showWorkspaceLink
        />
      </div>

      <Link
        href={workspaceHref}
        className="flex items-center justify-between border-t border-cp-border/60 px-4 py-2.5 text-xs font-medium text-cp-primary transition-colors hover:bg-cp-elevated/40 sm:hidden"
      >
        Open workspace
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function HostTournamentsHub({ roles }: HostTournamentsHubProps) {
  const { confirm } = useConfirmDialog();
  const { data: items = [], isLoading, isError, error } = useHostTournamentsList();
  const deleteTournament = useDeleteHostTournament();

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
            <Link href={dashboardRoutes.hostTournamentsNewReclub}>
              <Plus className="mr-2 h-4 w-4" />
              Create reclub
            </Link>
          </Button>
        </div>
      }
    >
      <LoadingOverlay show={deleteTournament.isPending} label="Deleting tournament…" />

      {isLoading ? (
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
          <p className="mt-4 font-medium text-foreground">No tournaments yet</p>
          <p className="mt-1 text-sm text-cp-muted">
            Create an official ranked event or a free reclub session.
          </p>
          <div className="mx-auto mt-6 grid w-full max-w-xs grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <Button asChild className="h-10 w-full bg-cp-primary">
              <Link href={`${dashboardRoutes.host}/tournaments/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create official
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 w-full border-emerald-500/40 text-emerald-300"
            >
              <Link href={dashboardRoutes.hostTournamentsNewReclub}>
                <Plus className="mr-2 h-4 w-4" />
                Create reclub
              </Link>
            </Button>
          </div>
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
      )}
    </DashboardWorkspaceShell>
  );
}
