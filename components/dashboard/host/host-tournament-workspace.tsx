"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  GitBranch,
  Layers,
  Loader2,
  Swords,
  Users,
} from "lucide-react";
import { HostOfficialRegistrationsPanel } from "@/components/dashboard/host/workspace/host-official-registrations-panel";
import { HostReclubLobbyPanel } from "@/components/dashboard/host/workspace/host-reclub-lobby-panel";
import {
  HostTournamentIconActions,
  TournamentStatusPanel,
  TournamentTypeBadge,
  WorkspaceSection,
  WorkspaceStatCard,
} from "@/components/dashboard/host/host-tournament-ui";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useDeleteHostTournament,
  useHostTournamentWorkspace,
} from "@/hooks/use-host-tournaments";
import { useGenerateBracket, useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { dashboardRoutes } from "@/lib/constants/routes";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { toast } from "sonner";

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type HostTournamentWorkspaceProps = {
  tournamentId: number;
};

export function HostTournamentWorkspace({ tournamentId }: HostTournamentWorkspaceProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const { data: ws, isLoading, isError, error } = useHostTournamentWorkspace(tournamentId);
  const generateBracket = useGenerateBracket(tournamentId);
  const deleteTournament = useDeleteHostTournament();

  const sportSlug = ws?.tournament.sportSlug ?? "";
  const tournamentSlug = ws?.tournament.slug ?? "";
  const isOfficial = ws?.tournament.tournamentType === "official";

  const { data: bracketData } = useTournamentBracket(sportSlug, tournamentSlug, {
    enabled: isOfficial,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <LoadingSpinner label="Loading workspace…" />
      </div>
    );
  }

  if (isError || !ws) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-red-300">
        {error instanceof Error ? error.message : "Workspace unavailable"}
      </div>
    );
  }

  const { tournament, summary, teams, matches, registrations, revenue } = ws;
  const canEdit = tournament.status !== "completed" && tournament.status !== "cancelled";

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this tournament?",
      description: "This cannot be undone. Tournaments with paid registrations cannot be deleted.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    deleteTournament.mutate(tournamentId, {
      onSuccess: () => router.push(dashboardRoutes.hostTournaments),
    });
  };

  return (
    <div className="mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <LoadingOverlay show={deleteTournament.isPending} label="Deleting…" />

      <Link
        href={dashboardRoutes.hostTournaments}
        className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4 shrink-0" />
        All tournaments
      </Link>

      <header className="mt-4 overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card sm:mt-6">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <TournamentTypeBadge tournamentType={tournament.tournamentType} />
            <h1 className="mt-3 break-words text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
              {tournament.name}
            </h1>
            <p className="mt-1 text-sm text-cp-muted">
              {tournament.sportName} · {summary.registeredPlayers} players ·{" "}
              {summary.registeredTeams} teams
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:max-w-xs">
            <TournamentStatusPanel
              status={tournament.status}
              startsAt={tournament.startsAt}
              endsAt={tournament.endsAt}
            />

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
              onDelete={() => void handleDelete()}
              deletePending={deleteTournament.isPending}
            />
          </div>
        </div>

        {isOfficial ? (
          <div className="border-t border-cp-border px-4 py-3 sm:px-5">
            <Button
              className="h-10 w-full bg-cp-primary sm:w-auto"
              disabled={generateBracket.isPending || bracketData?.generated}
              onClick={() => generateBracket.mutate()}
            >
              {generateBracket.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitBranch className="mr-2 h-4 w-4" />
              )}
              {bracketData?.generated ? "Bracket generated" : "Generate bracket"}
            </Button>
          </div>
        ) : null}
      </header>

      <div
        className={
          isOfficial
            ? "mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:mt-8 lg:grid-cols-4"
            : "mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:mt-8 lg:grid-cols-3"
        }
      >
        <WorkspaceStatCard label="Players" value={String(summary.registeredPlayers)} icon={Users} />
        <WorkspaceStatCard label="Teams" value={String(summary.registeredTeams)} icon={Layers} />
        {isOfficial ? (
          <>
            <WorkspaceStatCard
              label="Collected"
              value={formatIdr(revenue.totalCollectedIdr)}
              icon={Banknote}
            />
            <WorkspaceStatCard
              label="Your payout"
              value={formatIdr(revenue.hostPayoutIdr)}
              icon={Banknote}
            />
          </>
        ) : (
          <WorkspaceStatCard label="Rounds played" value={String(matches.length)} icon={Swords} />
        )}
      </div>

      {isOfficial ? (
        <div className="mt-8 sm:mt-10">
          <HostOfficialRegistrationsPanel registrations={registrations} />
        </div>
      ) : (
        <HostReclubLobbyPanel
          sportSlug={tournament.sportSlug}
          tournamentSlug={tournament.slug}
          teams={teams}
          matches={matches}
          playersPerTeam={tournament.playersPerTeam}
        />
      )}

      {isOfficial && bracketData?.generated ? (
        <WorkspaceSection
          title="Bracket"
          description="Bracket is live on the public tournament page after generation."
          className="mt-8 sm:mt-10"
        >
          <div className="rounded-2xl border border-cp-border bg-cp-card px-4 py-8 text-center text-sm text-cp-muted">
            View and manage matches from the public bracket tab or edit settings from the tournament
            editor.
          </div>
        </WorkspaceSection>
      ) : null}
    </div>
  );
}
