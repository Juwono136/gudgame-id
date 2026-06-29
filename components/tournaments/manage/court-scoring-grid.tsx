"use client";

import { useCallback, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { ManageScoringHistoryPanel } from "@/components/tournaments/tournament-players-live-stats-panel";
import { OfficialBracketLive } from "@/components/tournaments/official-bracket-live";
import { ManageCourtCard } from "@/components/tournaments/manage/manage-court-card";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useCompleteReclubRound,
  useStartReclubRound,
  useUpdateReclubLiveScore,
} from "@/hooks/use-tournament-lobby";
import { useRenameTournamentCourt } from "@/hooks/use-tournament-courts";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { planAmericanoRound } from "@/lib/tournaments/americano/round-planner";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import {
  getMaxRounds,
  getScoringTypeLabel,
  getTournamentCourtCount,
  getTournamentPointsPerMatch,
  getTournamentRoundDurationMinutes,
  getTournamentScoringType,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { isFunMatchType, isOfficialType } from "@/lib/tournaments/core/types";
import { getOfficialBillingLabel } from "@/lib/tournaments/ui/labels";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

type CourtScoringGridProps = {
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
  livePhase: string;
};

export function CourtScoringGrid({ tournament, participant, livePhase }: CourtScoringGridProps) {
  const { confirm } = useConfirmDialog();
  const { data, isLoading, isError, error, refetch, isFetching } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const startRound = useStartReclubRound(tournament.sportSlug, tournament.slug);
  const completeRound = useCompleteReclubRound(tournament.sportSlug, tournament.slug);
  const updateScore = useUpdateReclubLiveScore(tournament.sportSlug, tournament.slug);
  const renameCourt = useRenameTournamentCourt(tournament.sportSlug, tournament.slug);

  const isBracketMode = data?.mode === "bracket";
  const courts = data?.courts ?? [];
  const teams = data?.teams ?? [];
  const matches = data?.reclubMatches ?? [];
  const activeMatches = data?.activeReclubMatches ?? [];
  const bracketMatches = data?.bracketMatches ?? [];
  const canScore = participant.canUseCourtsideScoring && livePhase === "live";
  const isOfficial = isOfficialType(tournament.tournamentType);
  const isFunMatch = isFunMatchType(tournament.tournamentType);
  const sessionStats = data?.sessionStats;
  const statsVariant = isOfficial ? "official" : "reclub";
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);
  const scoringType = getTournamentScoringType(tournament);
  const roundDuration = getTournamentRoundDurationMinutes(tournament);
  const courtCountSetting = getTournamentCourtCount(tournament);
  const scoringLabel = getScoringTypeLabel(scoringType);

  const scoringMeta = (
    <div className="mt-2 flex flex-wrap gap-2">
      <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5 text-[11px] text-cp-muted">
        {scoringLabel} · first to {pointsPerMatch} pts
      </span>
      <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5 text-[11px] text-cp-muted">
        {courtCountSetting} court{courtCountSetting === 1 ? "" : "s"} configured
      </span>
      {isOfficial ? (
        <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5 text-[11px] text-cp-muted">
          {getOfficialBillingLabel(tournament.officialBilling)}
        </span>
      ) : null}
      {scoringType === "timed" ? (
        <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5 text-[11px] text-cp-muted">
          {roundDuration} min per round
        </span>
      ) : null}
    </div>
  );

  const squadsWithPlayers = useMemo(
    () => teams.filter((t) => t.memberCount > 0),
    [teams],
  );

  const historyPanel = (
    <ManageScoringHistoryPanel
      sessionStats={sessionStats}
      matches={matches}
      bracketMatches={bracketMatches}
      variant={statsVariant}
      isLoading={isFetching && !sessionStats}
    />
  );
  const [teamAByCourt, setTeamAByCourt] = useState<Record<string, string>>({});
  const [teamBByCourt, setTeamBByCourt] = useState<Record<string, string>>({});
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [courtNameDraft, setCourtNameDraft] = useState("");

  const completedRounds = matches.filter((m) => m.status === "completed").length;
  const maxRounds = getMaxRounds(tournament);
  const currentRound = completedRounds + (activeMatches.length > 0 ? 1 : 0) + 1;

  const matchByCourt = useMemo(() => {
    const map = new Map<string, ReclubMatchView>();
    for (const m of activeMatches) {
      if (m.courtId) map.set(m.courtId, m);
    }
    return map;
  }, [activeMatches]);

  const allPlayers = useMemo(
    () =>
      teams.flatMap((t) =>
        (t.members ?? []).map((m) => ({
          id: m.userId,
          name: m.displayName ?? "Player",
        })),
      ),
    [teams],
  );

  const roundPlan = useMemo(() => {
    if (tournament.format !== "americano" || allPlayers.length < 4) return null;
    return planAmericanoRound({
      players: allPlayers,
      courtCount: courts.length || 1,
      roundNumber: currentRound,
      seed: tournament.id.charCodeAt(0),
    });
  }, [allPlayers, courts.length, currentRound, tournament.format, tournament.id]);

  const handleStartOnCourt = async (courtId: string) => {
    const teamAId = teamAByCourt[courtId];
    const teamBId = teamBByCourt[courtId];
    if (!teamAId || !teamBId || teamAId === teamBId) {
      toast.error("Select two different teams");
      return;
    }
    const teamA = teams.find((t) => t.id === teamAId)?.name ?? "Team A";
    const teamB = teams.find((t) => t.id === teamBId)?.name ?? "Team B";
    const court = courts.find((c) => c.id === courtId)?.name ?? "Court";
    const ok = await confirm({
      title: "Start match on court?",
      description: `${teamA} vs ${teamB} on ${court}`,
      confirmLabel: "Start match",
    });
    if (!ok) return;
    await startRound.mutateAsync({ teamAId, teamBId, courtId });
    setTeamAByCourt((p) => ({ ...p, [courtId]: "" }));
    setTeamBByCourt((p) => ({ ...p, [courtId]: "" }));
  };

  const handleScoreChange = useCallback(
    (matchId: string, input: {
      scoreA: number;
      scoreB: number;
      action?: "increment" | "decrement" | "set";
      side?: "a" | "b";
    }) => {
      updateScore.mutate({ matchId, ...input });
    },
    [updateScore],
  );

  const handleComplete = useCallback(
    async (match: ReclubMatchView, elapsed: number) => {
      const ok = await confirm({
        title: "Finalize match?",
        description: `Save ${match.teamAName} ${match.scoreA ?? 0}–${match.scoreB ?? 0} ${match.teamBName} to history.`,
        confirmLabel: "Finalize",
      });
      if (!ok) return;
      await completeRound.mutateAsync({
        matchId: match.id,
        scoreA: match.scoreA ?? 0,
        scoreB: match.scoreB ?? 0,
        durationSeconds: elapsed,
      });
      void refetch();
    },
    [completeRound, confirm, refetch],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <LoadingSpinner label="Loading scoring workspace…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center">
        <p className="text-sm font-medium text-red-200">Could not load scoring</p>
        <p className="mt-1 text-sm text-red-200/70">{error?.message ?? "Unknown error"}</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isBracketMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cp-border bg-cp-card p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bracket live scoring</h2>
            <p className="text-sm text-cp-muted">
              {squadsWithPlayers.length} squad{squadsWithPlayers.length === 1 ? "" : "s"} with players
              {tournament.maxTeams ? ` · max ${tournament.maxTeams}` : ""} · {tournament.playersPerTeam}{" "}
              per team · {courts.length} court{courts.length === 1 ? "" : "s"}
              {!isFunMatch && data?.summary
                ? ` · ${data.summary.registeredTeams} registered · ${bracketMatches.filter((m) => m.status === "completed").length}/${bracketMatches.length} matches done`
                : ""}
              {isFetching ? " · Updating…" : ""}
            </p>
            {scoringMeta}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Refresh
          </Button>
        </div>

        {livePhase !== "live" ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
            Set the tournament status to <strong>Live</strong> before scoring bracket matches.
          </div>
        ) : null}

        {bracketMatches.length > 0 ? (
          <OfficialBracketLive
            sportSlug={tournament.sportSlug}
            slug={tournament.slug}
            matches={bracketMatches}
            participant={participant}
            pointsPerMatch={pointsPerMatch}
            variant={isOfficial ? "official" : "reclub"}
            officialScoringEnabled={livePhase === "live"}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
            Generate the bracket first from the Bracket tab, then return here to score matches.
          </div>
        )}

        {isFunMatch && courts.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/10 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-foreground">Multi-court scoring</h2>
              <p className="mt-1 text-sm text-cp-muted">
                Assign squads per court and update scores with +/- controls — same workflow as official
                Americano. Use this for friendly rounds alongside the elimination bracket above.
              </p>
              {scoringMeta}
            </div>

            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))] sm:gap-4">
              {courts.map((court) => {
                const match = matchByCourt.get(court.id) ?? null;
                const busy = Boolean(court.activeMatchId);
                return (
                  <ManageCourtCard
                    key={court.id}
                    court={court}
                    match={match}
                    teams={teams}
                    activeMatches={activeMatches}
                    canScore={canScore}
                    teamAId={teamAByCourt[court.id] ?? ""}
                    teamBId={teamBByCourt[court.id] ?? ""}
                    onTeamAChange={(v) => setTeamAByCourt((p) => ({ ...p, [court.id]: v }))}
                    onTeamBChange={(v) => setTeamBByCourt((p) => ({ ...p, [court.id]: v }))}
                    onStart={() => void handleStartOnCourt(court.id)}
                    starting={startRound.isPending}
                    busy={busy}
                    pointsPerMatch={pointsPerMatch}
                    scoringType={scoringType}
                    roundDuration={roundDuration}
                    editingName={editingCourtId === court.id}
                    nameDraft={courtNameDraft}
                    onEditName={() => {
                      setEditingCourtId(court.id);
                      setCourtNameDraft(court.name);
                    }}
                    onNameDraftChange={setCourtNameDraft}
                    onSaveName={async () => {
                      const ok = await confirm({
                        title: "Rename court?",
                        description: `Save court name as "${courtNameDraft.trim()}"?`,
                        confirmLabel: "Save",
                      });
                      if (!ok) return;
                      await renameCourt.mutateAsync({ courtId: court.id, name: courtNameDraft });
                      setEditingCourtId(null);
                    }}
                    onCancelEdit={() => setEditingCourtId(null)}
                    onScoreChange={(input) => handleScoreChange(match!.id, input)}
                    onComplete={(elapsed) => void handleComplete(match!, elapsed)}
                    completing={completeRound.isPending}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {historyPanel}

        {(startRound.isPending || completeRound.isPending) && <LoadingOverlay show />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cp-border bg-cp-card p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Multi-court scoring</h2>
          <p className="text-sm text-cp-muted">
            Round #{currentRound}
            {maxRounds != null ? ` of ${maxRounds}` : ""} · assign squads per court, update scores, then finalize
          </p>
          <p className="mt-1 text-xs text-cp-muted">
            {squadsWithPlayers.length} squad{squadsWithPlayers.length === 1 ? "" : "s"} ready
            {tournament.maxTeams ? ` · capacity ${tournament.maxTeams}` : ""} · {tournament.playersPerTeam}{" "}
            players per team · {activeMatches.length} live · {matches.filter((m) => m.status === "completed").length}{" "}
            finished
          </p>
          {scoringMeta}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {roundPlan && roundPlan.resting.length > 0 ? (
        <div className="rounded-xl border border-cp-border/70 bg-cp-elevated/20 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-cp-primary" />
            Resting this round
          </p>
          <p className="mt-1 text-sm text-cp-muted">
            {roundPlan.resting.map((p) => p.name).join(", ")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))] sm:gap-4">
        {courts.map((court) => {
          const match = matchByCourt.get(court.id) ?? null;
          const busy = Boolean(court.activeMatchId);
          return (
            <ManageCourtCard
              key={court.id}
              court={court}
              match={match}
              teams={teams}
              activeMatches={activeMatches}
              canScore={canScore}
              teamAId={teamAByCourt[court.id] ?? ""}
              teamBId={teamBByCourt[court.id] ?? ""}
              onTeamAChange={(v) => setTeamAByCourt((p) => ({ ...p, [court.id]: v }))}
              onTeamBChange={(v) => setTeamBByCourt((p) => ({ ...p, [court.id]: v }))}
              onStart={() => void handleStartOnCourt(court.id)}
              starting={startRound.isPending}
              busy={busy}
              pointsPerMatch={pointsPerMatch}
              scoringType={scoringType}
              roundDuration={roundDuration}
              editingName={editingCourtId === court.id}
              nameDraft={courtNameDraft}
              onEditName={() => {
                setEditingCourtId(court.id);
                setCourtNameDraft(court.name);
              }}
              onNameDraftChange={setCourtNameDraft}
              onSaveName={async () => {
                const ok = await confirm({
                  title: "Rename court?",
                  description: `Save court name as "${courtNameDraft.trim()}"?`,
                  confirmLabel: "Save",
                });
                if (!ok) return;
                await renameCourt.mutateAsync({ courtId: court.id, name: courtNameDraft });
                setEditingCourtId(null);
              }}
              onCancelEdit={() => setEditingCourtId(null)}
              onScoreChange={(input) => handleScoreChange(match!.id, input)}
              onComplete={(elapsed) => void handleComplete(match!, elapsed)}
              completing={completeRound.isPending}
            />
          );
        })}
      </div>

      {historyPanel}

      {(startRound.isPending || completeRound.isPending) && <LoadingOverlay show />}
    </div>
  );
}
