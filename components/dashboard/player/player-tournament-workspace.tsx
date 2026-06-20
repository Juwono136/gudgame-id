"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Layers,
  MapPin,
  Pencil,
  Swords,
  Trash2,
  Users,
} from "lucide-react";
import { HostReclubLobbyPanel } from "@/components/dashboard/host/workspace/host-reclub-lobby-panel";
import {
  TournamentStatusPanel,
  TournamentTypeBadge,
  WorkspaceStatCard,
} from "@/components/dashboard/host/host-tournament-ui";
import { TournamentRichTextSections } from "@/components/tournaments/tournament-rich-text-sections";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { hasRichTextContent } from "@/lib/wiki/sanitize-rich-text";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useDeleteManageTournament,
  useManageTournamentWorkspace,
} from "@/hooks/use-manage-tournament";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getMaxRounds, getVenueMapsUrl } from "@/lib/tournaments/settings";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { toast } from "sonner";

type PlayerTournamentWorkspaceProps = {
  tournamentId: string;
};

function PlayerTournamentActions({
  tournamentId,
  sportSlug,
  slug,
  canEdit,
  onEditDisabled,
  onDelete,
  deletePending,
}: {
  tournamentId: string;
  sportSlug: string;
  slug: string;
  canEdit: boolean;
  onEditDisabled: () => void;
  onDelete: () => void;
  deletePending?: boolean;
}) {
  const publicHref = publicSportRoutes.tournament(sportSlug, slug);
  const editHref = dashboardRoutes.tournamentEdit(tournamentId);

  return (
    <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:justify-end sm:gap-1">
      {canEdit ? (
        <Button
          asChild
          size="icon"
          variant="outline"
          className="h-11 w-full border-cp-border/80 bg-cp-elevated/30 sm:h-9 sm:w-9"
          title="Edit session"
        >
          <Link href={editHref} aria-label="Edit session">
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-full border-cp-border/80 bg-cp-elevated/30 sm:h-9 sm:w-9"
          title="Edit session"
          onClick={onEditDisabled}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button
        asChild
        size="icon"
        variant="outline"
        className="h-11 w-full border-cp-border/80 bg-cp-elevated/30 sm:h-9 sm:w-9"
        title="Public page"
      >
        <Link href={publicHref} target="_blank" rel="noopener noreferrer" aria-label="Open public page">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={deletePending}
        className="h-11 w-full border-red-500/30 text-red-400 sm:h-9 sm:w-9"
        title="Delete session"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PlayerTournamentWorkspace({ tournamentId }: PlayerTournamentWorkspaceProps) {
  const { confirm } = useConfirmDialog();
  const { data: ws, isLoading, isError, error } = useManageTournamentWorkspace(tournamentId);
  const deleteTournament = useDeleteManageTournament();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <LoadingSpinner label="Loading session…" />
      </div>
    );
  }

  if (isError || !ws) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-red-300">
        {error instanceof Error ? error.message : "Session unavailable"}
      </div>
    );
  }

  const { tournament, summary, teams, matches } = ws;
  const isReclub = tournament.tournamentType === "recreational";
  const canEdit = tournament.status !== "completed" && tournament.status !== "cancelled";
  const maxRounds = getMaxRounds(tournament);
  const venueMapsUrl = getVenueMapsUrl(tournament);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this session?",
      description: "This cannot be undone. Sessions with active brackets cannot be deleted.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    deleteTournament.mutate(tournamentId);
  };

  if (!isReclub) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-cp-muted">
        This workspace is for reclub sessions you created. Official tournaments are managed from
        the host dashboard.
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <LoadingOverlay show={deleteTournament.isPending} label="Deleting…" />

      <Link
        href={`${dashboardRoutes.tournaments}?scope=created`}
        className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4 shrink-0" />
        My tournaments
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
              {summary.registeredTeams} squads
            </p>
            {tournament.venue ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-cp-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {venueMapsUrl ? (
                  <a
                    href={venueMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cp-primary hover:underline"
                  >
                    {tournament.venue}
                  </a>
                ) : (
                  tournament.venue
                )}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 lg:max-w-xs">
            <TournamentStatusPanel
              status={tournament.status}
              startsAt={tournament.startsAt}
              endsAt={tournament.endsAt}
            />
            <PlayerTournamentActions
              tournamentId={tournament.id}
              sportSlug={tournament.sportSlug}
              slug={tournament.slug}
              canEdit={canEdit}
              onEditDisabled={() =>
                toast.error("This session can’t be edited", {
                  description: "Completed or cancelled sessions are locked for edits.",
                })
              }
              onDelete={() => void handleDelete()}
              deletePending={deleteTournament.isPending}
            />
          </div>
        </div>

        {hasRichTextContent(tournament.summary) ? (
          <div className="border-t border-cp-border px-4 py-4 sm:px-5">
            <RichHtmlContent html={tournament.summary} variant="article" />
          </div>
        ) : null}
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:mt-8 lg:grid-cols-4">
        <WorkspaceStatCard label="Players" value={String(summary.registeredPlayers)} icon={Users} />
        <WorkspaceStatCard label="Squads" value={String(summary.registeredTeams)} icon={Layers} />
        <WorkspaceStatCard label="Rounds played" value={String(matches.length)} icon={Swords} />
        <WorkspaceStatCard
          label="Max rounds"
          value={maxRounds != null ? String(maxRounds) : "—"}
          icon={Swords}
        />
      </div>

      <TournamentRichTextSections tournament={tournament} showSummary={false} className="mt-8 sm:mt-10" />

      <HostReclubLobbyPanel
        sportSlug={tournament.sportSlug}
        tournamentSlug={tournament.slug}
        teams={teams}
        matches={matches}
        playersPerTeam={tournament.playersPerTeam}
      />
    </div>
  );
}
