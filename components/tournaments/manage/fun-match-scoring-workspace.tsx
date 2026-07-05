"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { FunMatchLiveHub } from "@/components/tournaments/fun-match/fun-match-live-hub";
import { OfficialManagePointLogPanel } from "@/components/tournaments/official/official-manage-point-log-panel";
import { OfficialPlayerStandingsTable } from "@/components/tournaments/official/official-player-standings-table";
import { ManageScoringHistoryPanel } from "@/components/tournaments/tournament-players-live-stats-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useStartBracketMatchOnCourt,
  useSubmitBracketScore,
  useUpdateBracketLiveScore,
} from "@/hooks/use-tournament-bracket";
import {
  useCompleteReclubRound,
  useStartReclubRound,
  useUpdateReclubLiveScore,
} from "@/hooks/use-tournament-lobby";
import { useRenameTournamentCourt } from "@/hooks/use-tournament-courts";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { planAmericanoRound } from "@/lib/tournaments/americano/round-planner";
import {
  applyAmericanoPlanToIdleCourts,
  assignmentsToCourtState,
  decodeCourtAmericanoPairing,
  flattenAmericanoPlayers,
  getBusyPlayerIds,
  isAmericanoPairKey,
} from "@/lib/tournaments/americano/court-assignments";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import {
  getMaxRounds,
  getScoringTypeLabel,
  getTournamentCourtCount,
  getTournamentDeuceConfig,
  getTournamentMatchScoringHint,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { bracketMatchToReclubView } from "@/lib/tournaments/reclub/types";
import {
  dedupeReclubMatchViews,
  getCurrentSessionRound,
  groupMatchesByRound,
} from "@/lib/tournaments/reclub/round-groups";
import { computeFunMatchStandings } from "@/lib/tournaments/stats/fun-match-standings";
import {
  getBusyTeamIds,
  planIdleCourtReshuffle,
} from "@/lib/tournaments/fun-match/reshuffle-idle-courts";
import {
  FunMatchPlayerStandingsTable,
} from "@/components/tournaments/fun-match/fun-match-standings-table";
import { FunMatchStatsLegend } from "@/components/tournaments/fun-match/fun-match-stats-legend";
import { getOfficialBillingLabel } from "@/lib/tournaments/ui/labels";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { computeOfficialPlayerStandings } from "@/lib/tournaments/stats/official-standings";
import {
  cpAlertDangerSubtextClass,
  cpAlertDangerSurfaceClass,
  cpAlertDangerTextClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";
import type { ScoringRules } from "@/lib/tournaments/scoring/engine";

type FunMatchScoringWorkspaceProps = {
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
  livePhase: string;
  /** Official tournaments reuse this workspace without reshuffle and with audit panels. */
  workspaceVariant?: "fun_match" | "official";
};

export function FunMatchScoringWorkspace({
  tournament,
  participant,
  livePhase,
  workspaceVariant = "fun_match",
}: FunMatchScoringWorkspaceProps) {
  const { confirm } = useConfirmDialog();
  const { data, isLoading, isError, error, refetch, isFetching } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const startRound = useStartReclubRound(tournament.sportSlug, tournament.slug);
  const completeRound = useCompleteReclubRound(tournament.sportSlug, tournament.slug);
  const updateScore = useUpdateReclubLiveScore(tournament.sportSlug, tournament.slug);
  const renameCourt = useRenameTournamentCourt(tournament.sportSlug, tournament.slug);
  const startBracketOnCourt = useStartBracketMatchOnCourt(tournament.sportSlug, tournament.slug);
  const updateBracketScore = useUpdateBracketLiveScore(tournament.sportSlug, tournament.slug);
  const finalizeBracketScore = useSubmitBracketScore(tournament.sportSlug, tournament.slug);

  const isBracketMode = data?.mode === "bracket";
  const courts = data?.courts ?? [];
  const teams = data?.teams ?? [];
  const matches = data?.reclubMatches ?? [];
  const activeMatches = data?.activeReclubMatches ?? [];
  const bracketMatches = data?.bracketMatches ?? [];
  const activeBracketMatches = data?.activeBracketMatches ?? [];
  const sessionStats = data?.sessionStats;
  const canScore = participant.canUseCourtsideScoring && livePhase === "live";
  const isOfficialWorkspace =
    workspaceVariant === "official" || isOfficialType(tournament.tournamentType);
  const accentVariant = isOfficialWorkspace ? "official" : "fun";
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);
  const scoringType = getTournamentScoringType(tournament);
  const courtCountSetting = getTournamentCourtCount(tournament);
  const scoringLabel = getScoringTypeLabel(scoringType);
  const matchScoringHint = getTournamentMatchScoringHint(tournament);
  const maxRounds = getMaxRounds(tournament);

  const scoringRules: ScoringRules = useMemo(
    () => ({
      pointsPerMatch,
      deuceConfig: getTournamentDeuceConfig(tournament),
      scoringType,
    }),
    [pointsPerMatch, scoringType, tournament],
  );

  const [teamAByCourt, setTeamAByCourt] = useState<Record<string, string>>({});
  const [teamBByCourt, setTeamBByCourt] = useState<Record<string, string>>({});
  const [bracketPickByCourt, setBracketPickByCourt] = useState<Record<string, string>>({});
  const [reshuffleSeed, setReshuffleSeed] = useState(0);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [courtNameDraft, setCourtNameDraft] = useState("");

  const squadsWithPlayers = useMemo(
    () => teams.filter((t) => t.memberCount > 0),
    [teams],
  );

  const bracketAsReclub = useMemo(
    () =>
      bracketMatches
        .filter((m) => m.status === "completed" || m.status === "in_progress")
        .map((m) => ({
          ...bracketMatchToReclubView({
            id: m.id,
            roundNumber: m.roundNumber,
            matchNumber: m.matchNumber,
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            teamAName: m.teamAName,
            teamBName: m.teamBName,
            teamAPlayers: m.teamAPlayers,
            teamBPlayers: m.teamBPlayers,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            status: m.status,
          }),
          courtId: m.courtId ?? null,
        })),
    [bracketMatches],
  );

  const allMatchesForDisplay = useMemo(
    () => dedupeReclubMatchViews([...matches, ...bracketAsReclub]),
    [matches, bracketAsReclub],
  );

  const currentRound = useMemo(
    () => getCurrentSessionRound(allMatchesForDisplay, activeMatches),
    [allMatchesForDisplay, activeMatches],
  );

  const roundGroups = useMemo(
    () => groupMatchesByRound(allMatchesForDisplay, { includeFriendly: false }),
    [allMatchesForDisplay],
  );

  const isAmericanoMode = !isBracketMode && tournament.format === "americano";
  const americanoPlayers = useMemo(() => flattenAmericanoPlayers(teams), [teams]);
  const busyPlayerIds = useMemo(
    () => getBusyPlayerIds(activeMatches, teams),
    [activeMatches, teams],
  );

  const { players: playerStandings } = useMemo(
    () =>
      computeFunMatchStandings(
        allMatchesForDisplay.filter((m) => m.status === "completed"),
        teams,
        { americano: isAmericanoMode },
      ),
    [allMatchesForDisplay, teams, isAmericanoMode],
  );

  const { players: officialPlayerStandings } = useMemo(
    () =>
      computeOfficialPlayerStandings(
        bracketMatches,
        matches,
        teams,
        { americano: isAmericanoMode },
      ),
    [bracketMatches, matches, teams, isAmericanoMode],
  );

  const matchByCourt = useMemo(() => {
    const map = new Map<string, ReclubMatchView>();
    for (const m of activeMatches) {
      if (m.courtId) map.set(m.courtId, m);
    }
    for (const bm of activeBracketMatches) {
      if (bm.courtId) {
        map.set(
          bm.courtId,
          bracketMatchToReclubView({
            id: bm.id,
            roundNumber: bm.roundNumber,
            matchNumber: bm.matchNumber,
            teamAId: bm.teamAId,
            teamBId: bm.teamBId,
            teamAName: bm.teamAName,
            teamBName: bm.teamBName,
            teamAPlayers: bm.teamAPlayers,
            teamBPlayers: bm.teamBPlayers,
            scoreA: bm.scoreA,
            scoreB: bm.scoreB,
            status: bm.status,
          }),
        );
      }
    }
    return map;
  }, [activeMatches, activeBracketMatches]);

  const startableBracketMatches = useMemo(
    () =>
      bracketMatches
        .filter(
          (m) =>
            (m.status === "pending" || m.status === "completed") && m.teamAId && m.teamBId,
        )
        .sort((a, b) => {
          if (a.status === "pending" && b.status === "completed") return -1;
          if (a.status === "completed" && b.status === "pending") return 1;
          if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
          return a.matchNumber - b.matchNumber;
        }),
    [bracketMatches],
  );

  const allPlayers = useMemo(
    () => americanoPlayers.map((p) => ({ id: p.id, name: p.name })),
    [americanoPlayers],
  );

  const roundPlan = useMemo(() => {
    if (!isAmericanoMode || allPlayers.length < 4) return null;
    const availablePlayers = americanoPlayers.filter((p) => !busyPlayerIds.has(p.id));
    if (availablePlayers.length < 4) return null;
    return planAmericanoRound({
      players: availablePlayers.map((p) => ({ id: p.id, name: p.name })),
      courtCount: courts.filter((c) => !matchByCourt.get(c.id)).length || courts.length || 1,
      roundNumber: currentRound,
      seed: tournament.id.charCodeAt(0) + reshuffleSeed,
    });
  }, [
    allPlayers.length,
    americanoPlayers,
    busyPlayerIds,
    courts,
    currentRound,
    isAmericanoMode,
    matchByCourt,
    reshuffleSeed,
    tournament.id,
  ]);

  const applyRoundPlanToCourts = useCallback(() => {
    const idleCourtIds = courts.filter((c) => !matchByCourt.get(c.id)).map((c) => c.id);
    const result = applyAmericanoPlanToIdleCourts({
      plan: roundPlan,
      idleCourtIds,
      teams,
      busyPlayerIds,
    });

    if (!result.ok) {
      toast.message(result.message);
      return;
    }

    const state = assignmentsToCourtState(result.assignments);
    setTeamAByCourt((prev) => ({ ...prev, ...state.teamAByCourt }));
    setTeamBByCourt((prev) => ({ ...prev, ...state.teamBByCourt }));

    toast.success("Round plan applied to idle courts", {
      description: result.restingNames.length
        ? `Resting this round: ${result.restingNames.join(", ")}`
        : `${result.assignments.length} court${result.assignments.length === 1 ? "" : "s"} assigned — review pairings, then start.`,
    });
  }, [busyPlayerIds, courts, matchByCourt, roundPlan, teams]);

  const handleReshuffle = useCallback(() => {
    const idleCourtIds = courts.filter((c) => !matchByCourt.get(c.id)).map((c) => c.id);
    if (!idleCourtIds.length) {
      toast.message("All courts are busy — finish a match before reshuffling");
      return;
    }

    const nextSeed = reshuffleSeed + 1;
    const seed = tournament.id.charCodeAt(0) + nextSeed;
    const busyTeamIds = getBusyTeamIds(activeMatches, activeBracketMatches);

    const mode = isBracketMode
      ? "bracket"
      : tournament.format === "americano" && allPlayers.length >= 4
        ? "americano"
        : "squads";

    const result = planIdleCourtReshuffle({
      mode,
      idleCourtIds,
      squads: squadsWithPlayers,
      busyTeamIds,
      startableMatches: startableBracketMatches,
      activeReclub: activeMatches,
      activeBracket: activeBracketMatches,
      roundNumber: currentRound,
      seed,
    });

    const nextA = { ...teamAByCourt };
    const nextB = { ...teamBByCourt };
    const nextBracket = { ...bracketPickByCourt };

    for (const courtId of idleCourtIds) {
      nextA[courtId] = "";
      nextB[courtId] = "";
      nextBracket[courtId] = "";
    }

    if (result.kind === "bracket") {
      for (const assignment of result.assignments) {
        nextBracket[assignment.courtId] = assignment.bracketMatchId;
      }
      setBracketPickByCourt(nextBracket);
      setTeamAByCourt(nextA);
      setTeamBByCourt(nextB);
      setReshuffleSeed(nextSeed);

      if (!result.assignments.length) {
        toast.message("No startable bracket matches for idle courts", {
          description: "Squads on other courts may still be playing, or all bracket slots are assigned.",
        });
        return;
      }

      toast.success("Bracket matches reshuffled", {
        description: `${result.assignments.length} idle court${result.assignments.length === 1 ? "" : "s"} assigned — review before starting.`,
      });
      return;
    }

    for (const assignment of result.assignments) {
      nextA[assignment.courtId] = assignment.teamAId;
      nextB[assignment.courtId] = assignment.teamBId;
    }
    setTeamAByCourt(nextA);
    setTeamBByCourt(nextB);
    setBracketPickByCourt(nextBracket);
    setReshuffleSeed(nextSeed);

    if (!result.assignments.length) {
      toast.message("Not enough available squads to pair on idle courts", {
        description:
          busyTeamIds.size > 0
            ? "Some squads are still live on other courts."
            : "Need at least two squads with players.",
      });
      return;
    }

    const resting =
      result.kind === "americano"
        ? result.restingPlayerNames
        : result.restingSquadNames;

    toast.success("Courts reshuffled", {
      description: resting.length
        ? `Resting this round: ${resting.join(", ")}`
        : `${result.assignments.length} idle court${result.assignments.length === 1 ? "" : "s"} updated — review before starting.`,
    });
  }, [
    activeBracketMatches,
    activeMatches,
    allPlayers,
    courts,
    currentRound,
    isBracketMode,
    matchByCourt,
    reshuffleSeed,
    squadsWithPlayers,
    startableBracketMatches,
    teamAByCourt,
    teamBByCourt,
    bracketPickByCourt,
    tournament.format,
    tournament.id,
  ]);

  const resolveAmericanoStart = useCallback(
    (courtId: string) => {
      const teamAKey = teamAByCourt[courtId];
      const teamBKey = teamBByCourt[courtId];
      if (!isAmericanoPairKey(teamAKey) || !isAmericanoPairKey(teamBKey)) return null;

      const pairing = decodeCourtAmericanoPairing(teamAKey, teamBKey);
      if (!pairing) return null;

      const playerById = new Map(americanoPlayers.map((p) => [p.id, p]));
      const sideASquads = pairing.sideA.map((id) => playerById.get(id)?.squadId).filter(Boolean);
      const sideBSquads = pairing.sideB.map((id) => playerById.get(id)?.squadId).filter(Boolean);
      if (sideASquads.length !== 2 || sideBSquads.length !== 2) return null;

      return {
        teamAId: sideASquads[0]!,
        teamBId: sideBSquads[0]!,
        americanoPairing: pairing,
      };
    },
    [americanoPlayers, teamAByCourt, teamBByCourt],
  );

  const handleStartOnCourt = async (courtId: string) => {
    const bracketMatchId = bracketPickByCourt[courtId];
    if (isBracketMode && bracketMatchId) {
      await startBracketOnCourt.mutateAsync({ matchId: bracketMatchId, courtId });
      setBracketPickByCourt((p) => ({ ...p, [courtId]: "" }));
      void refetch();
      return;
    }

    if (isAmericanoMode) {
      const payload = resolveAmericanoStart(courtId);
      if (!payload) {
        toast.error("Apply the round plan or reshuffle idle courts first");
        return;
      }
      await startRound.mutateAsync({
        ...payload,
        courtId,
        sessionRound: currentRound,
      });
      setTeamAByCourt((p) => ({ ...p, [courtId]: "" }));
      setTeamBByCourt((p) => ({ ...p, [courtId]: "" }));
      return;
    }

    const teamAId = teamAByCourt[courtId];
    const teamBId = teamBByCourt[courtId];
    if (!teamAId || !teamBId || teamAId === teamBId) {
      toast.error("Select two different squads");
      return;
    }
    await startRound.mutateAsync({
      teamAId,
      teamBId,
      courtId,
      sessionRound: currentRound,
    });
    setTeamAByCourt((p) => ({ ...p, [courtId]: "" }));
    setTeamBByCourt((p) => ({ ...p, [courtId]: "" }));
  };

  const handleStartAllCourts = async () => {
    const idleCourts = courts.filter((c) => !matchByCourt.get(c.id));
    let started = 0;
    for (const court of idleCourts) {
      const bracketMatchId = bracketPickByCourt[court.id];
      if (isBracketMode && bracketMatchId) {
        await startBracketOnCourt.mutateAsync({ matchId: bracketMatchId, courtId: court.id });
        setBracketPickByCourt((p) => ({ ...p, [court.id]: "" }));
        started++;
        continue;
      }

      if (isAmericanoMode) {
        const payload = resolveAmericanoStart(court.id);
        if (!payload) continue;
        await startRound.mutateAsync({
          ...payload,
          courtId: court.id,
          sessionRound: currentRound,
        });
        setTeamAByCourt((p) => ({ ...p, [court.id]: "" }));
        setTeamBByCourt((p) => ({ ...p, [court.id]: "" }));
        started++;
        continue;
      }

      const teamAId = teamAByCourt[court.id];
      const teamBId = teamBByCourt[court.id];
      if (!teamAId || !teamBId || teamAId === teamBId) continue;
      await startRound.mutateAsync({
        teamAId,
        teamBId,
        courtId: court.id,
        sessionRound: currentRound,
      });
      setTeamAByCourt((p) => ({ ...p, [court.id]: "" }));
      setTeamBByCourt((p) => ({ ...p, [court.id]: "" }));
      started++;
    }
    if (!started) {
      toast.message(
        isAmericanoMode
          ? "Apply the round plan to idle courts first"
          : "Assign squads or bracket matches on idle courts first",
      );
    } else toast.success(`Started ${started} court${started === 1 ? "" : "s"}`);
  };

  const handleFinishRound = async () => {
    const liveCount = activeMatches.length + activeBracketMatches.length;
    if (!liveCount) {
      toast.message("No live matches to finalize");
      return;
    }
    const ok = await confirm({
      title: "Finish round?",
      description: `Finalize ${liveCount} live match${liveCount === 1 ? "" : "es"} with current scores.`,
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

    for (const bm of activeBracketMatches) {
      const scoreA = bm.scoreA ?? 0;
      const scoreB = bm.scoreB ?? 0;
      if (scoreA === scoreB) {
        toast.error(`Tied score on ${bm.teamAName} vs ${bm.teamBName} — finalize individually`);
        continue;
      }
      await finalizeBracketScore.mutateAsync({ matchId: bm.id, scoreA, scoreB });
    }

    void refetch();
    toast.success("Round saved to history");
  };

  const handleScoreChange = useCallback(
    (
      matchId: string,
      input: {
        scoreA: number;
        scoreB: number;
        action?: "increment" | "decrement" | "set";
        side?: "a" | "b";
        isBracket?: boolean;
      },
    ) => {
      if (input.isBracket) {
        updateBracketScore.mutate({
          matchId,
          scoreA: input.scoreA,
          scoreB: input.scoreB,
          action: input.action,
          side: input.side,
        });
        return;
      }
      updateScore.mutate({ matchId, ...input });
    },
    [updateBracketScore, updateScore],
  );

  const handleComplete = useCallback(
    async (match: ReclubMatchView) => {
      const isBracket = match.sourceKind === "bracket" || match.playType === "bracket";
      const scoreA = match.scoreA ?? 0;
      const scoreB = match.scoreB ?? 0;

      if (scoreA === scoreB) {
        toast.error("Scores are tied — adjust before finalizing");
        return;
      }

      const ok = await confirm({
        title: "Finalize match?",
        description: `Save ${match.teamAName} ${scoreA}–${scoreB} ${match.teamBName} to history.`,
        confirmLabel: "Finalize",
      });
      if (!ok) return;

      if (isBracket) {
        await finalizeBracketScore.mutateAsync({ matchId: match.id, scoreA, scoreB });
      } else {
        const elapsed = match.startedAt
          ? Math.max(0, Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 1000))
          : 0;
        await completeRound.mutateAsync({
          matchId: match.id,
          scoreA,
          scoreB,
          durationSeconds: elapsed,
        });
      }
      void refetch();
    },
    [completeRound, confirm, finalizeBracketScore, refetch],
  );

  const handleEditCourtName = useCallback((courtId: string, currentName: string) => {
    setEditingCourtId(courtId);
    setCourtNameDraft(currentName);
  }, []);

  const handleSaveCourtName = async () => {
    if (!editingCourtId) return;
    const ok = await confirm({
      title: "Rename court?",
      description: `Save court name as "${courtNameDraft.trim()}"?`,
      confirmLabel: "Save",
    });
    if (!ok) return;
    await renameCourt.mutateAsync({ courtId: editingCourtId, name: courtNameDraft });
    setEditingCourtId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <LoadingSpinner label="Loading live scoring…" />
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

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cp-border bg-cp-card/60 px-4 py-3">
      <div className="space-y-2">
        <p className="text-sm text-cp-muted">
          {scoringLabel} · {matchScoringHint} · {courtCountSetting} court
          {courtCountSetting === 1 ? "" : "s"}
          {isBracketMode ? " · elimination" : " · americano"}
          {roundPlan && roundPlan.resting.length > 0
            ? ` · resting: ${roundPlan.resting.map((p) => p.name).join(", ")}`
            : ""}
        </p>
        {isOfficialWorkspace ? (
          <div className="flex flex-wrap gap-2">
            {tournament.categoryLabel ? (
              <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5 text-[11px] text-cp-muted">
                {tournament.categoryLabel}
              </span>
            ) : null}
            <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5 text-[11px] text-cp-muted">
              {getOfficialBillingLabel(tournament.officialBilling)}
            </span>
            <span className="rounded-full border border-cp-primary/25 bg-cp-primary/10 px-2.5 py-0.5 text-[11px] text-cp-primary">
              Point-by-point audit log
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
        {!isBracketMode && canScore && isAmericanoMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyRoundPlanToCourts}
            title="Assign this round's 2v2 partner rotation to idle courts"
          >
            Apply plan
          </Button>
        ) : null}
      </div>
    </div>
  );

  const hasActive =
    activeMatches.length > 0 || activeBracketMatches.length > 0;

  return (
    <div className="space-y-5">
      <FunMatchLiveHub
        roundGroups={roundGroups}
        currentRound={currentRound}
        courts={courts}
        teams={teams}
        matchByCourt={matchByCourt}
        teamAByCourt={teamAByCourt}
        teamBByCourt={teamBByCourt}
        bracketPickByCourt={bracketPickByCourt}
        startableBracketMatches={startableBracketMatches}
        isBracketMode={isBracketMode}
        onTeamAChange={(courtId, v) => setTeamAByCourt((p) => ({ ...p, [courtId]: v }))}
        onTeamBChange={(courtId, v) => setTeamBByCourt((p) => ({ ...p, [courtId]: v }))}
        onBracketPickChange={(courtId, v) =>
          setBracketPickByCourt((p) => ({ ...p, [courtId]: v }))
        }
        onStartCourt={(courtId) => void handleStartOnCourt(courtId)}
        onScoreChange={handleScoreChange}
        onCompleteMatch={(m) => void handleComplete(m)}
        onEditCourtName={handleEditCourtName}
        canManage={canScore}
        readOnly={!canScore}
        pointsPerMatch={pointsPerMatch}
        scoringRules={scoringRules}
        starting={startRound.isPending || startBracketOnCourt.isPending}
        maxRounds={maxRounds}
        onReshuffle={
          canScore && (!isOfficialWorkspace || isAmericanoMode) ? handleReshuffle : undefined
        }
        onStartAllCourts={canScore ? () => void handleStartAllCourts() : undefined}
        onFinishRound={canScore ? () => void handleFinishRound() : undefined}
        hasActiveMatches={hasActive}
        toolbar={toolbar}
        accentVariant={accentVariant}
        isAmericanoMode={isAmericanoMode}
        americanoPlayers={americanoPlayers}
      />

      {editingCourtId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-cp-border bg-cp-card p-5 shadow-xl">
            <h3 className="font-semibold text-foreground">Rename court</h3>
            <Input
              value={courtNameDraft}
              onChange={(e) => setCourtNameDraft(e.target.value)}
              className="mt-3"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingCourtId(null)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => void handleSaveCourtName()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
        <h3 className="text-base font-semibold text-foreground">
          {isOfficialWorkspace ? "Official leaderboard" : "Leaderboard"}
        </h3>
        <p className="mt-1 text-sm text-cp-muted">
          {isOfficialWorkspace
            ? "Player standings with ranking points and logged scoring activity."
            : isAmericanoMode
              ? "Rankings follow Americano rules — total points each player scored across rounds."
              : "Player standings update when matches are finalized."}
        </p>
        {isAmericanoMode && !isOfficialWorkspace ? (
          <FunMatchStatsLegend variant="americano" className="mt-3" compact />
        ) : null}
        <div className="mt-4">
          {isOfficialWorkspace ? (
            <OfficialPlayerStandingsTable rows={officialPlayerStandings} />
          ) : (
            <FunMatchPlayerStandingsTable rows={playerStandings} />
          )}
        </div>
      </section>

      <ManageScoringHistoryPanel
        sessionStats={sessionStats}
        matches={matches}
        bracketMatches={bracketMatches}
        variant={isOfficialWorkspace ? "official" : "reclub"}
        standingsMode={isBracketMode ? "elimination" : "americano"}
        isLoading={isFetching && !sessionStats}
      />

      {isOfficialWorkspace ? (
        <OfficialManagePointLogPanel
          bracketMatches={bracketMatches}
          reclubMatches={matches}
          categoryLabel={tournament.categoryLabel}
        />
      ) : null}

      {(startRound.isPending ||
        completeRound.isPending ||
        startBracketOnCourt.isPending ||
        finalizeBracketScore.isPending) && <LoadingOverlay show />}
    </div>
  );
}
