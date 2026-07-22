"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, Shuffle, Users } from "lucide-react";
import { toast } from "sonner";
import { ManageCourtCard } from "@/components/tournaments/manage/manage-court-card";
import { FunMatchHostTools } from "@/components/tournaments/manage/fun-match-host-tools";
import { ManageScoringHistoryPanel } from "@/components/tournaments/tournament-players-live-stats-panel";
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
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { manageCourtGridClassName, cpAlertDangerSubtextClass, cpAlertDangerSurfaceClass, cpAlertDangerTextClass } from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type FunMatchRoundPanelProps = {
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
  livePhase: string;
};

function playTypeLabel(playType?: string | null, playNumber?: number | null): string {
  if (playType === "friendly") return "Friendly";
  if (playType === "bracket_rematch") return playNumber ? `Rematch #${playNumber}` : "Rematch";
  if (playType === "bracket") return "Bracket";
  return "Round";
}

export function FunMatchRoundPanel({
  tournament,
  participant,
  livePhase,
}: FunMatchRoundPanelProps) {
  const { confirm } = useConfirmDialog();
  const { data, isLoading, isError, error, refetch, isFetching } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const startRound = useStartReclubRound(tournament.sportSlug, tournament.slug);
  const completeRound = useCompleteReclubRound(tournament.sportSlug, tournament.slug);
  const updateScore = useUpdateReclubLiveScore(tournament.sportSlug, tournament.slug);
  const renameCourt = useRenameTournamentCourt(tournament.sportSlug, tournament.slug);

  const courts = data?.courts ?? [];
  const teams = data?.teams ?? [];
  const matches = data?.reclubMatches ?? [];
  const activeMatches = data?.activeReclubMatches ?? [];
  const sessionStats = data?.sessionStats;
  const canScore = participant.canUseCourtsideScoring && livePhase === "live";
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);
  const scoringType = getTournamentScoringType(tournament);
  const roundDuration = getTournamentRoundDurationMinutes(tournament);
  const courtCountSetting = getTournamentCourtCount(tournament);
  const scoringLabel = getScoringTypeLabel(scoringType);
  const maxRounds = getMaxRounds(tournament);

  const [teamAByCourt, setTeamAByCourt] = useState<Record<string, string>>({});
  const [teamBByCourt, setTeamBByCourt] = useState<Record<string, string>>({});
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [courtNameDraft, setCourtNameDraft] = useState("");
  const [reshuffleSeed, setReshuffleSeed] = useState(0);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const squadsWithPlayers = useMemo(
    () => teams.filter((t) => t.memberCount > 0),
    [teams],
  );

  const completedRounds = matches.filter((m) => m.status === "completed").length;
  const currentRound = completedRounds + (activeMatches.length > 0 ? 1 : 0) + 1;
  const displayRound = selectedRound ?? currentRound;

  const roundNumbers = useMemo(() => {
    const nums = new Set<number>();
    for (const m of matches) nums.add(m.roundNumber);
    nums.add(currentRound);
    return [...nums].sort((a, b) => a - b);
  }, [matches, currentRound]);

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
          squadId: t.id,
          teamId: t.id,
          teamName: t.name,
        })),
      ),
    [teams],
  );

  const roundPlan = useMemo(() => {
    if (allPlayers.length < 4) return null;
    return planAmericanoRound({
      players: allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        squadId: p.squadId,
      })),
      courtCount: courts.length || 1,
      roundNumber: displayRound,
      seed: tournament.id.charCodeAt(0) + reshuffleSeed,
    });
  }, [allPlayers, courts.length, displayRound, reshuffleSeed, tournament.id]);

  const applyRoundPlanToCourts = useCallback(() => {
    if (!roundPlan?.pairings.length) return;
    const idleCourts = courts.filter((c) => !matchByCourt.get(c.id));
    const nextA: Record<string, string> = { ...teamAByCourt };
    const nextB: Record<string, string> = { ...teamBByCourt };

    roundPlan.pairings.forEach((pairing, idx) => {
      const court = idleCourts[idx];
      if (!court) return;
      const squadA = squadsWithPlayers.find((s) =>
        s.members?.some((m) => m.userId === pairing.teamA[0]?.id),
      );
      const squadB = squadsWithPlayers.find((s) =>
        s.members?.some((m) => m.userId === pairing.teamB[0]?.id),
      );
      if (squadA && squadB && squadA.id !== squadB.id) {
        nextA[court.id] = squadA.id;
        nextB[court.id] = squadB.id;
      }
    });

    setTeamAByCourt(nextA);
    setTeamBByCourt(nextB);
  }, [courts, matchByCourt, roundPlan, squadsWithPlayers, teamAByCourt, teamBByCourt]);

  const handleReshuffle = useCallback(() => {
    setReshuffleSeed((s) => s + 1);
    const pool = [...squadsWithPlayers];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const idleCourts = courts.filter((c) => !matchByCourt.get(c.id));
    const nextA: Record<string, string> = { ...teamAByCourt };
    const nextB: Record<string, string> = { ...teamBByCourt };
    let idx = 0;
    for (const court of idleCourts) {
      const teamA = pool[idx++];
      const teamB = pool[idx++];
      if (!teamA || !teamB) break;
      nextA[court.id] = teamA.id;
      nextB[court.id] = teamB.id;
    }
    setTeamAByCourt(nextA);
    setTeamBByCourt(nextB);
    toast.success("Courts reshuffled");
  }, [courts, matchByCourt, squadsWithPlayers, teamAByCourt, teamBByCourt]);

  const handleStartOnCourt = async (courtId: string) => {
    const teamAId = teamAByCourt[courtId];
    const teamBId = teamBByCourt[courtId];
    if (!teamAId || !teamBId || teamAId === teamBId) {
      toast.error("Select two different squads");
      return;
    }
    await startRound.mutateAsync({ teamAId, teamBId, courtId });
    setTeamAByCourt((p) => ({ ...p, [courtId]: "" }));
    setTeamBByCourt((p) => ({ ...p, [courtId]: "" }));
  };

  const handleStartAllCourts = async () => {
    const idleCourts = courts.filter((c) => !matchByCourt.get(c.id));
    let started = 0;
    for (const court of idleCourts) {
      const teamAId = teamAByCourt[court.id];
      const teamBId = teamBByCourt[court.id];
      if (!teamAId || !teamBId || teamAId === teamBId) continue;
      await startRound.mutateAsync({ teamAId, teamBId, courtId: court.id });
      setTeamAByCourt((p) => ({ ...p, [court.id]: "" }));
      setTeamBByCourt((p) => ({ ...p, [court.id]: "" }));
      started++;
    }
    if (!started) toast.message("Assign squads on idle courts first");
    else toast.success(`Started ${started} court${started === 1 ? "" : "s"}`);
  };

  const handleFinishRound = async () => {
    if (!activeMatches.length) {
      toast.message("No live matches to finalize");
      return;
    }
    const ok = await confirm({
      title: "Finish round?",
      description: `Finish ${activeMatches.length} live match${activeMatches.length === 1 ? "" : "es"} with current scores.`,
      confirmLabel: "Finish round",
    });
    if (!ok) return;
    for (const match of activeMatches) {
      const elapsed = match.startedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 1000))
        : 0;
      await completeRound.mutateAsync({
        matchId: match.id,
        scoreA: match.scoreA ?? 0,
        scoreB: match.scoreB ?? 0,
        durationSeconds: elapsed,
      });
    }
    void refetch();
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
        title: "Finish this match?",
        description: `Save ${match.teamAName} ${match.scoreA ?? 0}–${match.scoreB ?? 0} ${match.teamBName} to history.`,
        confirmLabel: "Finish match",
        cancelLabel: "Keep scoring",
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
        <LoadingSpinner label="Loading round workspace…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("p-6 text-center", cpAlertDangerSurfaceClass)}>
        <p className={cn("text-sm font-medium", cpAlertDangerTextClass)}>Could not load scoring</p>
        <p className={cn("mt-1 text-sm", cpAlertDangerSubtextClass)}>{error?.message ?? "Unknown error"}</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Round planner</h2>
            <p className="text-sm text-cp-muted">
              Round {displayRound}
              {maxRounds != null ? ` of ${maxRounds}` : ""} · {scoringLabel} · first to {pointsPerMatch} pts ·{" "}
              {courtCountSetting} court{courtCountSetting === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
            {canScore ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={handleReshuffle}>
                  <Shuffle className="mr-1.5 h-4 w-4" />
                  Reshuffle
                </Button>
                <Button type="button" size="sm" onClick={() => void handleStartAllCourts()}>
                  Start all courts
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!activeMatches.length}
                  onClick={() => void handleFinishRound()}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Finish round
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {roundNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSelectedRound(n)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                displayRound === n
                  ? "bg-emerald-600 text-white"
                  : "border border-cp-border bg-cp-elevated/40 text-cp-muted hover:text-foreground",
              )}
            >
              Round {n}
            </button>
          ))}
        </div>
      </div>

      {roundPlan && roundPlan.resting.length > 0 ? (
        <div className="rounded-xl border border-cp-border/70 bg-cp-elevated/20 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-emerald-400" />
            Resting this round
          </p>
          <p className="mt-1 text-sm text-cp-muted">
            {roundPlan.resting.map((p) => p.name).join(", ")}
          </p>
        </div>
      ) : null}

      {participant.canUseCourtsideScoring ? (
        <FunMatchHostTools
          sportSlug={tournament.sportSlug}
          slug={tournament.slug}
          teams={teams}
          activeReclubMatches={activeMatches}
          canManage={canScore}
          showReshuffle={false}
          onMoved={() => void refetch()}
        />
      ) : null}

      <div className={manageCourtGridClassName}>
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
              onScoreChange={(input) => match && handleScoreChange(match.id, input)}
              onComplete={(elapsed) => match && void handleComplete(match, elapsed)}
              completing={completeRound.isPending}
            />
          );
        })}
      </div>

      <ManageScoringHistoryPanel
        sessionStats={sessionStats}
        matches={matches.map((m) => ({
          ...m,
          summary:
            m.summary ??
            `${playTypeLabel(m.playType, m.playNumber)} · ${m.teamAName} vs ${m.teamBName}`,
        }))}
        variant="reclub"
        standingsMode="americano"
        isLoading={isFetching && !sessionStats}
      />

      {(startRound.isPending || completeRound.isPending) && <LoadingOverlay show />}
    </div>
  );
}
