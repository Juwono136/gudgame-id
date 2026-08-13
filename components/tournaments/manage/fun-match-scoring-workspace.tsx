"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FunMatchLiveHub } from "@/components/tournaments/fun-match/fun-match-live-hub";
import { AmericanoManagePairingsDialog } from "@/components/tournaments/manage/americano-manage-pairings-dialog";
import { FunMatchHostTools } from "@/components/tournaments/manage/fun-match-host-tools";
import { OfficialManagePointLogPanel } from "@/components/tournaments/official/official-manage-point-log-panel";
import { OfficialPlayerStandingsTable } from "@/components/tournaments/official/official-player-standings-table";
import { MatchRecapShareCard } from "@/components/partners/match-recap-share-card";
import { ManageScoringHistoryPanel } from "@/components/tournaments/tournament-players-live-stats-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { MatchRecapInput } from "@/lib/partners/match-recap";
import { getTournamentDisplayConfig } from "@/lib/tournaments/settings";
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
import { planMexicanoRound } from "@/lib/tournaments/mexicano/round-planner";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import {
  getMaxRounds,
  getScoringTypeLabel,
  getTournamentClassicSetRules,
  getTournamentCourtCount,
  getTournamentDeuceConfig,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentMatchScoringHint,
  getTournamentMexicanoSettings,
  getTournamentPointsPerMatch,
  getTournamentScoreEntryMode,
  getTournamentScoringType,
  isClassicSetsFormat,
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
import {
  useFinalizeGroupScore,
  useStartGroupMatchOnCourt,
  useUpdateGroupLiveScore,
} from "@/hooks/use-double-stage-group-score";
import { DoubleStageConfigBanner } from "@/components/tournaments/double-stage/double-stage-config-banner";
import { LiveFormatConfigBanner } from "@/components/tournaments/manage/live-format-config-banner";
import {
  buildGroupCourtLockState,
  isGroupMatchLockedForCourt,
} from "@/lib/tournaments/double-stage/group-court-lock";
import {
  groupMatchToReclubView,
  type StartableGroupFixture,
} from "@/lib/tournaments/double-stage/view-mappers";
import { computeParallelCapacity } from "@/lib/tournaments/courts/parallel-capacity";
import { cn } from "@/lib/utils";
import { parseStandingsScoring } from "@/lib/tournaments/scoring/config";
import type { ScoringRules } from "@/lib/tournaments/scoring/engine";
import { isRaceToGamesMatchComplete } from "@/lib/tournaments/scoring/game-mode";
import { isClassicMatchComplete } from "@/lib/tournaments/scoring/classic-sets";

type FunMatchScoringWorkspaceProps = {
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
  livePhase: string;
  /** Official tournaments reuse this workspace without reshuffle and with audit panels. */
  workspaceVariant?: "fun_match" | "official";
  /** Partner white-label display name for post-match social recaps. */
  partnerDisplayName?: string | null;
};

export function FunMatchScoringWorkspace({
  tournament,
  participant,
  livePhase,
  workspaceVariant = "fun_match",
  partnerDisplayName = null,
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
  const startGroupOnCourt = useStartGroupMatchOnCourt(tournament.sportSlug, tournament.slug);
  const updateGroupScore = useUpdateGroupLiveScore(tournament.sportSlug, tournament.slug);
  const finalizeGroupScore = useFinalizeGroupScore(tournament.sportSlug, tournament.slug);

  const isBracketMode = data?.mode === "bracket";
  const isGroupStageMode = data?.mode === "groups";
  const courts = data?.courts ?? [];
  const teams = data?.teams ?? [];
  const matches = data?.reclubMatches ?? [];
  const activeMatches = data?.activeReclubMatches ?? [];
  const bracketMatches = data?.bracketMatches ?? [];
  const activeBracketMatches = data?.activeBracketMatches ?? [];
  const groupMatches = data?.groupMatches ?? [];
  const activeGroupMatches = data?.activeGroupMatches ?? [];
  const doubleStageOverview = data?.doubleStage;
  const sessionStats = data?.sessionStats;
  /** Staff may assign fixtures even before status flips to live (avoids empty courts UI). */
  const canManageCourts = participant.canUseCourtsideScoring;
  /** Starting / incrementing scores requires the event to be live. */
  const canScore = canManageCourts && livePhase === "live";
  const isOfficialWorkspace =
    workspaceVariant === "official" || isOfficialType(tournament.tournamentType);
  const isPartnerEvent = Boolean(tournament.partnerId);
  const showScoreAudit = isOfficialWorkspace || isPartnerEvent;
  const partnerBrandPrimary =
    getTournamentDisplayConfig(tournament).brandTheme?.primaryColor ?? "#0d9488";
  const [pendingRecap, setPendingRecap] = useState<MatchRecapInput | null>(null);
  const isDoubleStageTournament = tournament.format === "double_stage";
  /** Partner double-stage needs group+knockout standings without Official billing chrome. */
  const useDoubleStageStandings =
    isDoubleStageTournament && (isOfficialWorkspace || isPartnerEvent);
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

  const gameRules = useMemo(
    () =>
      getTournamentMatchScoreMode(
        tournament,
        isBracketMode ? "knockout" : isGroupStageMode ? "group" : "default",
      ) === "games"
        ? getTournamentGameRules(
            tournament,
            isBracketMode ? "knockout" : isGroupStageMode ? "group" : "default",
          )
        : null,
    [tournament, isBracketMode, isGroupStageMode],
  );
  const classicSetRules = useMemo(
    () =>
      isClassicSetsFormat(
        tournament,
        isBracketMode ? "knockout" : isGroupStageMode ? "group" : "default",
      )
        ? getTournamentClassicSetRules(
            tournament,
            isBracketMode ? "knockout" : isGroupStageMode ? "group" : "default",
          )
        : null,
    [tournament, isBracketMode, isGroupStageMode],
  );
  const scoreEntryMode = getTournamentScoreEntryMode(tournament);

  const [teamAByCourt, setTeamAByCourt] = useState<Record<string, string>>({});
  const [teamBByCourt, setTeamBByCourt] = useState<Record<string, string>>({});
  const [bracketPickByCourt, setBracketPickByCourt] = useState<Record<string, string>>({});
  const [groupPickByCourt, setGroupPickByCourt] = useState<Record<string, string>>({});
  const [reshuffleSeed, setReshuffleSeed] = useState(0);
  const [startingAllCourts, setStartingAllCourts] = useState(false);
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
            scheduledAt: m.scheduledAt,
            startedAt: m.startedAt,
            completedAt: m.completedAt,
            gameState: m.gameState,
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
  const isMexicanoMode = !isBracketMode && tournament.format === "mexicano";
  const isLobbyRoundsMode = isAmericanoMode || isMexicanoMode;
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
        { americano: isLobbyRoundsMode },
      ),
    [allMatchesForDisplay, teams, isLobbyRoundsMode],
  );

  const allowGroupDraw = useMemo(() => {
    const raw = (tournament.settings as Record<string, unknown>)?.standingsScoring;
    return parseStandingsScoring(raw).allowDraw;
  }, [tournament.settings]);

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of doubleStageOverview?.groups ?? []) {
      map.set(g.id, g.name);
    }
    return map;
  }, [doubleStageOverview?.groups]);

  const groupMatchesAsReclub = useMemo(
    () =>
      groupMatches.map((m) => groupMatchToReclubView(m, groupNameById.get(m.groupId))),
    [groupMatches, groupNameById],
  );

  const officialSessionReclubMatches = useMemo(() => {
    if (useDoubleStageStandings) {
      return groupMatchesAsReclub;
    }
    if (isGroupStageMode) return groupMatchesAsReclub;
    return matches;
  }, [
    groupMatchesAsReclub,
    isGroupStageMode,
    matches,
    useDoubleStageStandings,
  ]);

  const { players: officialPlayerStandings } = useMemo(
    () => {
      if (useDoubleStageStandings) {
        const groupReclub = groupMatchesAsReclub.filter(
          (m) => m.status === "completed" || m.status === "in_progress",
        );
        return computeOfficialPlayerStandings(bracketMatches, groupReclub, teams, {
          americano: false,
        });
      }
      return computeOfficialPlayerStandings(
        bracketMatches,
        matches,
        teams,
        { americano: isAmericanoMode },
      );
    },
    [
      bracketMatches,
      groupMatchesAsReclub,
      isAmericanoMode,
      matches,
      teams,
      useDoubleStageStandings,
    ],
  );

  const startableGroupMatches = useMemo((): StartableGroupFixture[] => {
    if (!isGroupStageMode) return [];
    return groupMatches
      .filter((m) => m.status === "pending" && m.teamAId && m.teamBId)
      .map((m) => ({
        ...m,
        groupName: groupNameById.get(m.groupId) ?? "Group",
      }))
      .sort((a, b) => {
        const ga = a.groupName.localeCompare(b.groupName);
        if (ga !== 0) return ga;
        return a.matchNumber - b.matchNumber;
      });
  }, [groupMatches, groupNameById, isGroupStageMode]);

  useEffect(() => {
    if (!isGroupStageMode) return;
    const pendingById = new Map(startableGroupMatches.map((m) => [m.id, m]));
    setGroupPickByCourt((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [courtId, matchId] of Object.entries(next)) {
        if (!matchId) continue;
        const fixture = pendingById.get(matchId);
        if (!fixture) {
          next[courtId] = "";
          changed = true;
          continue;
        }
        const reservedPicks = Object.entries(next)
          .filter(([id, idMatch]) => Boolean(idMatch) && id !== courtId)
          .map(([, idMatch]) => {
            const other = pendingById.get(idMatch);
            return {
              matchId: idMatch,
              teamAId: other?.teamAId ?? null,
              teamBId: other?.teamBId ?? null,
            };
          });
        const lock = buildGroupCourtLockState(activeGroupMatches, {
          excludeCourtId: courtId,
          reservedPicks,
        });
        if (isGroupMatchLockedForCourt(fixture, lock)) {
          next[courtId] = "";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeGroupMatches, groupPickByCourt, isGroupStageMode, startableGroupMatches]);

  const matchByCourt = useMemo(() => {
    const map = new Map<string, ReclubMatchView>();
    for (const m of activeMatches) {
      if (m.courtId) map.set(m.courtId, m);
    }
      for (const bm of activeBracketMatches) {
      if (bm.courtId) {
        map.set(bm.courtId, {
          ...bracketMatchToReclubView({
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
            scheduledAt: bm.scheduledAt,
            startedAt: bm.startedAt,
            completedAt: bm.completedAt,
            gameState: bm.gameState,
          }),
          courtId: bm.courtId,
        });
      }
    }
    for (const gm of activeGroupMatches) {
      if (gm.courtId) {
        map.set(
          gm.courtId,
          groupMatchToReclubView(gm, groupNameById.get(gm.groupId)),
        );
      }
    }
    return map;
  }, [activeMatches, activeBracketMatches, activeGroupMatches, groupNameById]);

  const groupStageRoundGroups = useMemo(() => {
    if (!isGroupStageMode) return roundGroups;
    const completed = groupMatchesAsReclub.filter((m) => m.status === "completed");
    const live = groupMatchesAsReclub.filter((m) => m.status === "in_progress");
    const groups = [];
    if (completed.length) {
      groups.push({
        roundNumber: 1,
        matches: completed,
        liveCount: 0,
        completedCount: completed.length,
      });
    }
    if (live.length) {
      groups.push({
        roundNumber: 2,
        matches: live,
        liveCount: live.length,
        completedCount: 0,
      });
    }
    return groups;
  }, [groupMatchesAsReclub, isGroupStageMode, roundGroups]);

  const displayRoundGroups = isGroupStageMode ? groupStageRoundGroups : roundGroups;

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

  const parallelCapacityMode = isGroupStageMode
    ? "groups"
    : isBracketMode
      ? "bracket"
      : isAmericanoMode
        ? "americano"
        : "squads";

  const parallelCapacity = useMemo(
    () =>
      computeParallelCapacity({
        courts: courts.map((c) => ({ id: c.id, name: c.name })),
        mode: parallelCapacityMode,
        activeReclub: activeMatches,
        activeBracket: activeBracketMatches,
        activeGroup: activeGroupMatches,
        squads: squadsWithPlayers,
        startableBracket: startableBracketMatches,
        startableGroup: startableGroupMatches,
        roundNumber: currentRound,
        seed: tournament.id.charCodeAt(0) + reshuffleSeed,
      }),
    [
      activeBracketMatches,
      activeGroupMatches,
      activeMatches,
      courts,
      currentRound,
      isAmericanoMode,
      isBracketMode,
      isGroupStageMode,
      parallelCapacityMode,
      reshuffleSeed,
      squadsWithPlayers,
      startableBracketMatches,
      startableGroupMatches,
      tournament.id,
    ],
  );

  const isCourtStarting = useCallback(
    (courtId: string) =>
      (startRound.isPending && startRound.variables?.courtId === courtId) ||
      (startBracketOnCourt.isPending && startBracketOnCourt.variables?.courtId === courtId) ||
      (startGroupOnCourt.isPending && startGroupOnCourt.variables?.courtId === courtId),
    [
      startBracketOnCourt.isPending,
      startBracketOnCourt.variables?.courtId,
      startGroupOnCourt.isPending,
      startGroupOnCourt.variables?.courtId,
      startRound.isPending,
      startRound.variables?.courtId,
    ],
  );

  const allPlayers = useMemo(
    () => americanoPlayers.map((p) => ({ id: p.id, name: p.name, squadId: p.squadId })),
    [americanoPlayers],
  );

  const roundPlan = useMemo(() => {
    if (!isLobbyRoundsMode || allPlayers.length < 4) return null;
    const availablePlayers = americanoPlayers.filter((p) => !busyPlayerIds.has(p.id));
    if (availablePlayers.length < 4) return null;
    const courtCount =
      courts.filter((c) => !matchByCourt.get(c.id)).length || courts.length || 1;

    if (isMexicanoMode) {
      const pointsById = new Map(
        playerStandings.map((p) => [p.userId, p.points] as const),
      );
      const mexicano = getTournamentMexicanoSettings(tournament);
      const planned = planMexicanoRound({
        players: availablePlayers.map((p) => ({
          id: p.id,
          name: p.name,
          points: pointsById.get(p.id) ?? 0,
          teamId: p.squadId,
        })),
        courtCount,
        roundNumber: currentRound,
        mode: mexicano?.mode ?? "team",
      });
      return {
        roundNumber: planned.roundNumber,
        pairings: planned.pairings.map((pairing) => ({
          courtIndex: pairing.courtIndex,
          teamA: pairing.teamA,
          teamB: pairing.teamB,
        })),
        resting: planned.resting,
      };
    }

    return planAmericanoRound({
      players: availablePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        squadId: p.squadId,
      })),
      courtCount,
      roundNumber: currentRound,
      seed: tournament.id.charCodeAt(0) + reshuffleSeed,
    });
  }, [
    allPlayers.length,
    americanoPlayers,
    busyPlayerIds,
    courts,
    currentRound,
    isLobbyRoundsMode,
    isMexicanoMode,
    matchByCourt,
    playerStandings,
    reshuffleSeed,
    tournament,
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
      return result;
    }

    const state = assignmentsToCourtState(result.assignments);
    setTeamAByCourt((prev) => ({ ...prev, ...state.teamAByCourt }));
    setTeamBByCourt((prev) => ({ ...prev, ...state.teamBByCourt }));
    return result;
  }, [busyPlayerIds, courts, matchByCourt, roundPlan, teams]);

  // Auto-apply Americano plan when idle courts have no pairings yet (no separate Apply plan step).
  const autoPlanKeyRef = useRef("");
  useEffect(() => {
    if (!isLobbyRoundsMode || !canScore || !roundPlan) return;
    const idleCourtIds = courts.filter((c) => !matchByCourt.get(c.id)).map((c) => c.id);
    if (!idleCourtIds.length) return;
    const key = `${currentRound}:${reshuffleSeed}:${idleCourtIds.join(",")}`;
    if (autoPlanKeyRef.current === key) return;

    const needsPlan = idleCourtIds.some(
      (id) => !isAmericanoPairKey(teamAByCourt[id]) || !isAmericanoPairKey(teamBByCourt[id]),
    );
    if (!needsPlan) {
      autoPlanKeyRef.current = key;
      return;
    }

    const result = applyRoundPlanToCourts();
    if (result && result.ok) {
      autoPlanKeyRef.current = key;
    }
  }, [
    applyRoundPlanToCourts,
    canScore,
    courts,
    currentRound,
    isLobbyRoundsMode,
    matchByCourt,
    reshuffleSeed,
    roundPlan,
    teamAByCourt,
    teamBByCourt,
  ]);

  const [managePairingsCourtId, setManagePairingsCourtId] = useState<string | null>(null);
  const managePairingsCourt = courts.find((c) => c.id === managePairingsCourtId) ?? null;
  const handleReshuffle = useCallback(() => {
    const idleCourtIds = courts.filter((c) => !matchByCourt.get(c.id)).map((c) => c.id);
    if (!idleCourtIds.length) {
      toast.message("All courts are busy — finish a match before reshuffling");
      return;
    }

    const nextSeed = reshuffleSeed + 1;
    const seed = tournament.id.charCodeAt(0) + nextSeed;
    const busyTeamIds = getBusyTeamIds(activeMatches, activeBracketMatches);

    if (isGroupStageMode) {
      const lock = buildGroupCourtLockState(activeGroupMatches);
      const nextPick = { ...groupPickByCourt };
      for (const courtId of idleCourtIds) {
        nextPick[courtId] = "";
        const match = startableGroupMatches.find((m) => !isGroupMatchLockedForCourt(m, lock));
        if (match) {
          nextPick[courtId] = match.id;
          if (match.teamAId) lock.busyTeamIds.add(match.teamAId);
          if (match.teamBId) lock.busyTeamIds.add(match.teamBId);
        }
      }
      setGroupPickByCourt(nextPick);
      setReshuffleSeed((s) => s + 1);
      const assigned = idleCourtIds.filter((id) => nextPick[id]).length;
      if (!assigned) {
        toast.message("No available group fixtures for idle courts", {
          description:
            parallelCapacity.blockReason ??
            "Teams may still be playing on other courts.",
        });
        return;
      }
      toast.success("Group fixtures assigned to idle courts", {
        description: `${assigned} court${assigned === 1 ? "" : "s"} ready — review before starting.`,
      });
      return;
    }

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
      const sideA = pairing.sideA.map((id) => playerById.get(id));
      const sideB = pairing.sideB.map((id) => playerById.get(id));
      if (sideA.some((p) => !p) || sideB.some((p) => !p)) return null;

      const allIds = [...pairing.sideA, ...pairing.sideB];
      if (new Set(allIds).size !== 4) return null;

      const squadA = sideA[0]!.squadId;
      const squadB =
        sideB[0]!.squadId !== squadA ? sideB[0]!.squadId : sideB[1]!.squadId;
      if (!squadA || !squadB) return null;

      return {
        teamAId: squadA,
        teamBId: squadB,
        americanoPairing: pairing,
      };
    },
    [americanoPlayers, teamAByCourt, teamBByCourt],
  );

  const handleStartOnCourt = async (courtId: string) => {
    if (!canScore) {
      toast.message("Start the tournament (set status to Live) before scoring on courts");
      return;
    }
    const groupMatchId = groupPickByCourt[courtId];
    if (isGroupStageMode && groupMatchId) {
      await startGroupOnCourt.mutateAsync({ matchId: groupMatchId, courtId });
      setGroupPickByCourt((p) => ({ ...p, [courtId]: "" }));
      void refetch();
      return;
    }

    const bracketMatchId = bracketPickByCourt[courtId];
    if (isBracketMode && bracketMatchId) {
      await startBracketOnCourt.mutateAsync({ matchId: bracketMatchId, courtId });
      setBracketPickByCourt((p) => ({ ...p, [courtId]: "" }));
      void refetch();
      return;
    }

    if (isLobbyRoundsMode) {
      const payload = resolveAmericanoStart(courtId);
      if (!payload) {
        toast.error("Reshuffle idle courts or manage pairings first");
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
    if (!canScore) {
      toast.message("Start the tournament (set status to Live) before scoring on courts");
      return;
    }
    setStartingAllCourts(true);
    try {
      const idleCourts = courts.filter((c) => !matchByCourt.get(c.id));
      let started = 0;
      for (const court of idleCourts) {
        const groupMatchId = groupPickByCourt[court.id];
        if (isGroupStageMode && groupMatchId) {
          await startGroupOnCourt.mutateAsync({ matchId: groupMatchId, courtId: court.id });
          setGroupPickByCourt((p) => ({ ...p, [court.id]: "" }));
          started++;
          continue;
        }

        const bracketMatchId = bracketPickByCourt[court.id];
        if (isBracketMode && bracketMatchId) {
          await startBracketOnCourt.mutateAsync({ matchId: bracketMatchId, courtId: court.id });
          setBracketPickByCourt((p) => ({ ...p, [court.id]: "" }));
          started++;
          continue;
        }

        if (isLobbyRoundsMode) {
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
          isGroupStageMode
            ? "Assign group fixtures on idle courts first"
            : isAmericanoMode
              ? "Reshuffle idle courts or manage pairings first"
              : "Assign squads or bracket matches on idle courts first",
          {
            description: parallelCapacity.blockReason ?? undefined,
          },
        );
      } else {
        toast.success(`Started ${started} court${started === 1 ? "" : "s"}`);
      }
    } finally {
      setStartingAllCourts(false);
    }
  };

  const handleFinishRound = async () => {
    const liveCount =
      activeMatches.length + activeBracketMatches.length + activeGroupMatches.length;
    if (!liveCount) {
      toast.message("No live matches to finalize");
      return;
    }
    const ok = await confirm({
      title: "Finish round?",
      description: `Finish ${liveCount} live match${liveCount === 1 ? "" : "es"} with current scores.`,
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

    for (const gm of activeGroupMatches) {
      const scoreA = gm.scoreA ?? 0;
      const scoreB = gm.scoreB ?? 0;
      if (scoreA === scoreB && !allowGroupDraw) {
        toast.error(`Tied score on ${gm.teamAName} vs ${gm.teamBName} — finalize individually`);
        continue;
      }
      const elapsed = gm.startedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(gm.startedAt).getTime()) / 1000))
        : 0;
      await finalizeGroupScore.mutateAsync({
        matchId: gm.id,
        scoreA,
        scoreB,
        durationSeconds: elapsed,
      });
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
        action?: "increment" | "decrement" | "set" | "set_points" | "next_game";
        side?: "a" | "b";
        targetPoints?: number;
        scorerName?: string;
        scorerUserId?: string;
        servingSide?: "a" | "b";
        serverName?: string;
        serverUserId?: string;
        isBracket?: boolean;
        isGroup?: boolean;
      },
    ): Promise<unknown> => {
      const useGroup =
        input.isGroup === true || (isGroupStageMode && input.isBracket !== true);
      const useBracket =
        !useGroup &&
        (input.isBracket === true || (isBracketMode && input.isGroup !== true));

      if (useGroup) {
        return updateGroupScore.mutateAsync({
          matchId,
          scoreA: input.scoreA,
          scoreB: input.scoreB,
          scoreAction: input.action,
          side: input.side,
          targetPoints: input.targetPoints,
          scorerName: input.scorerName,
          scorerUserId: input.scorerUserId,
          servingSide: input.servingSide,
          serverName: input.serverName,
          serverUserId: input.serverUserId,
        });
      }
      if (useBracket) {
        return updateBracketScore.mutateAsync({
          matchId,
          scoreA: input.scoreA,
          scoreB: input.scoreB,
          action: input.action,
          side: input.side,
          targetPoints: input.targetPoints,
          scorerName: input.scorerName,
          scorerUserId: input.scorerUserId,
          servingSide: input.servingSide,
          serverName: input.serverName,
          serverUserId: input.serverUserId,
        });
      }
      return updateScore.mutateAsync({
        matchId,
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        action: input.action,
        side: input.side,
        scorerName: input.scorerName,
        scorerUserId: input.scorerUserId,
      });
    },
    [isBracketMode, isGroupStageMode, updateBracketScore, updateGroupScore, updateScore],
  );

  const handleComplete = useCallback(
    async (match: ReclubMatchView) => {
      const isGroup =
        match.sourceKind === "group_stage" || match.playType === "group_stage";
      const isBracket = match.sourceKind === "bracket" || match.playType === "bracket";
      const scoreA = match.scoreA ?? 0;
      const scoreB = match.scoreB ?? 0;

      if (scoreA === scoreB && !(isGroup && allowGroupDraw)) {
        toast.error("Scores are tied — adjust before finalizing");
        return;
      }

      if (classicSetRules && scoreEntryMode !== "paper") {
        const classic = isClassicMatchComplete(scoreA, scoreB, classicSetRules);
        if (!classic.complete) {
          const need = Math.ceil(classicSetRules.bestOfSets / 2);
          toast.error(`Match incomplete — first to ${need} sets wins`);
          return;
        }
      } else if (gameRules && scoreEntryMode !== "paper") {
        const race = isRaceToGamesMatchComplete(scoreA, scoreB, gameRules);
        if (!race.complete) {
          toast.error(`Match incomplete — first to ${gameRules.raceToGames} games wins`);
          return;
        }
      }

      const ok = await confirm({
        title: "Finish this match?",
        description: `Save ${match.teamAName} ${scoreA}–${scoreB} ${match.teamBName} to history. Groups standings will update immediately.`,
        confirmLabel: "Finish match",
        cancelLabel: "Keep scoring",
      });
      if (!ok) return;

      if (isGroup) {
        const elapsed = match.startedAt
          ? Math.max(0, Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 1000))
          : 0;
        await finalizeGroupScore.mutateAsync({
          matchId: match.id,
          scoreA,
          scoreB,
          durationSeconds: elapsed,
        });
      } else if (isBracket) {
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

      if (isPartnerEvent) {
        setPendingRecap({
          partnerName: partnerDisplayName?.trim() || "Partner event",
          tournamentName: tournament.name,
          teamAName: match.teamAName ?? "Side A",
          teamBName: match.teamBName ?? "Side B",
          teamAPlayers: match.teamAPlayers ?? [],
          teamBPlayers: match.teamBPlayers ?? [],
          scoreA,
          scoreB,
          roundLabel: isGroup ? "Group stage" : isBracket ? "Knockout" : "Match",
          completedAt: new Date().toISOString(),
        });
      }

      void refetch();
    },
    [
      allowGroupDraw,
      completeRound,
      confirm,
      finalizeBracketScore,
      finalizeGroupScore,
      gameRules,
      classicSetRules,
      scoreEntryMode,
      isPartnerEvent,
      partnerDisplayName,
      tournament.name,
      refetch,
    ],
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

  if (isGroupStageMode && doubleStageOverview?.phase === "knockout") {
    return (
      <div className="rounded-xl border border-cp-primary/30 bg-cp-primary/5 p-6 text-sm text-cp-muted">
        Group stage is complete. Score knockout matches here (bracket mode) or use the Bracket tab.
      </div>
    );
  }

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cp-border bg-cp-card/60 px-4 py-3">
      <div className="space-y-2">
        <p className="text-sm text-cp-muted">
          {scoringLabel} · {matchScoringHint} · {courtCountSetting} court
          {courtCountSetting === 1 ? "" : "s"}
          {isGroupStageMode
            ? " · group stage"
            : isBracketMode
              ? " · elimination"
              : " · americano"}
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
        ) : isPartnerEvent ? (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-cp-primary/25 bg-cp-primary/10 px-2.5 py-0.5 text-[11px] text-cp-primary">
              Score audit trail
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    </div>
  );

  const hasActive =
    activeMatches.length > 0 ||
    activeBracketMatches.length > 0 ||
    activeGroupMatches.length > 0;

  const pendingGroupCount = startableGroupMatches.length;

  return (
    <div className="space-y-5">
      {isGroupStageMode ? (
        <>
          <DoubleStageConfigBanner tournament={tournament} />
          {pendingGroupCount > 0 ? (
            <div className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 text-sm text-cp-muted">
              <span className="font-medium text-foreground">Group stage live scoring.</span> Assign
              fixtures to courts, start matches, then finalize scores. Standings update on the{" "}
              <span className="font-medium text-foreground">Groups</span> tab automatically.
              <span className="mt-1 block text-xs">
                {pendingGroupCount} group fixture{pendingGroupCount === 1 ? "" : "s"} remaining.
              </span>
            </div>
          ) : null}
        </>
      ) : isLobbyRoundsMode ? (
        <LiveFormatConfigBanner
          tournament={tournament}
          mode={isMexicanoMode ? "mexicano" : "americano"}
        />
      ) : isBracketMode ? (
        <LiveFormatConfigBanner tournament={tournament} mode="elimination" />
      ) : null}

      {courts.length > 0 ? (
        <div className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 text-sm text-cp-muted">
          <span className="font-medium text-foreground">{parallelCapacity.bannerText}</span>
          {parallelCapacity.blockReason && parallelCapacity.idleCourtCount > 0 ? (
            <span className="mt-1 block text-xs">{parallelCapacity.blockReason}</span>
          ) : null}
        </div>
      ) : null}

      <FunMatchLiveHub
        roundGroups={displayRoundGroups}
        currentRound={currentRound}
        courts={courts}
        teams={teams}
        matchByCourt={matchByCourt}
        teamAByCourt={teamAByCourt}
        teamBByCourt={teamBByCourt}
        bracketPickByCourt={bracketPickByCourt}
        groupPickByCourt={groupPickByCourt}
        startableBracketMatches={startableBracketMatches}
        startableGroupMatches={startableGroupMatches}
        activeGroupMatches={activeGroupMatches}
        isBracketMode={isBracketMode}
        isGroupStageMode={isGroupStageMode}
        onGroupPickChange={(courtId, v) =>
          setGroupPickByCourt((p) => ({ ...p, [courtId]: v }))
        }
        onTeamAChange={(courtId, v) => setTeamAByCourt((p) => ({ ...p, [courtId]: v }))}
        onTeamBChange={(courtId, v) => setTeamBByCourt((p) => ({ ...p, [courtId]: v }))}
        onBracketPickChange={(courtId, v) =>
          setBracketPickByCourt((p) => ({ ...p, [courtId]: v }))
        }
        onStartCourt={(courtId) => void handleStartOnCourt(courtId)}
        onScoreChange={handleScoreChange}
        onCompleteMatch={(m) => void handleComplete(m)}
        onEditCourtName={handleEditCourtName}
        canManage={canManageCourts}
        readOnly={!canManageCourts}
        pointsPerMatch={pointsPerMatch}
        scoringRules={scoringRules}
        gameRules={gameRules}
        classicSetRules={classicSetRules}
        scoreEntryMode={scoreEntryMode}
        sportSlug={tournament.sportSlug}
        tournamentSlug={tournament.slug}
        onOverrideSuccess={() => void refetch()}
        isCourtStarting={isCourtStarting}
        startingAll={startingAllCourts}
        maxRounds={maxRounds}
        onReshuffle={
          canManageCourts && (!isOfficialWorkspace || isLobbyRoundsMode || isGroupStageMode)
            ? handleReshuffle
            : undefined
        }
        onStartAllCourts={canManageCourts ? () => void handleStartAllCourts() : undefined}
        onFinishRound={canScore ? () => void handleFinishRound() : undefined}
        hasActiveMatches={hasActive}
        toolbar={toolbar}
        accentVariant={accentVariant}
        isAmericanoMode={isLobbyRoundsMode}
        americanoPlayers={americanoPlayers}
        onManageAmericanoPairings={
          canScore && isLobbyRoundsMode
            ? (courtId) => setManagePairingsCourtId(courtId)
            : undefined
        }
      />

      {canScore && !isGroupStageMode ? (
        <FunMatchHostTools
          sportSlug={tournament.sportSlug}
          slug={tournament.slug}
          teams={teams}
          activeReclubMatches={activeMatches}
          activeBracketMatches={activeBracketMatches}
          canManage={canScore}
          showReshuffle={false}
          onMoved={() => void refetch()}
        />
      ) : null}

      {managePairingsCourt && isLobbyRoundsMode ? (
        <AmericanoManagePairingsDialog
          open={Boolean(managePairingsCourtId)}
          onOpenChange={(open) => {
            if (!open) setManagePairingsCourtId(null);
          }}
          courtName={managePairingsCourt.name}
          players={americanoPlayers}
          busyPlayerIds={busyPlayerIds}
          sideAKey={teamAByCourt[managePairingsCourt.id]}
          sideBKey={teamBByCourt[managePairingsCourt.id]}
          onSave={(sideAKey, sideBKey) => {
            setTeamAByCourt((prev) => ({ ...prev, [managePairingsCourt.id]: sideAKey }));
            setTeamBByCourt((prev) => ({ ...prev, [managePairingsCourt.id]: sideBKey }));
            toast.success("Pairings updated", {
              description: `${managePairingsCourt.name} is ready to start.`,
            });
          }}
        />
      ) : null}

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

      {!isGroupStageMode || isOfficialWorkspace || isPartnerEvent ? (
        <>
          <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
            <h3 className="text-base font-semibold text-foreground">
              {isOfficialWorkspace ? "Official leaderboard" : "Leaderboard"}
            </h3>
            <p className="mt-1 text-sm text-cp-muted">
              {isOfficialWorkspace
                ? isDoubleStageTournament
                  ? "Player standings from group stage and knockout matches."
                  : isGroupStageMode
                  ? "Player standings from completed and live group fixtures."
                  : "Player standings with ranking points and logged scoring activity."
                : isAmericanoMode
                  ? "Rankings follow Americano rules — total points each player scored across rounds."
                  : "Player standings update when matches are finalized."}
            </p>
            {isAmericanoMode && !isOfficialWorkspace ? (
              <FunMatchStatsLegend variant="americano" className="mt-3" compact />
            ) : null}
            <div className="mt-4">
              {isOfficialWorkspace || useDoubleStageStandings ? (
                <OfficialPlayerStandingsTable rows={officialPlayerStandings} />
              ) : (
                <FunMatchPlayerStandingsTable rows={playerStandings} />
              )}
            </div>
          </section>

          <ManageScoringHistoryPanel
            sessionStats={sessionStats}
            matches={officialSessionReclubMatches}
            bracketMatches={bracketMatches}
            variant={isOfficialWorkspace || useDoubleStageStandings ? "official" : "reclub"}
            standingsMode={isBracketMode ? "elimination" : isGroupStageMode ? "americano" : "americano"}
            isLoading={isFetching && !sessionStats}
          />

          {showScoreAudit ? (
            <OfficialManagePointLogPanel
              bracketMatches={bracketMatches}
              reclubMatches={officialSessionReclubMatches}
              categoryLabel={tournament.categoryLabel}
              sportSlug={tournament.sportSlug}
              tournamentSlug={tournament.slug}
            />
          ) : null}
        </>
      ) : null}

      {pendingRecap ? (
        <MatchRecapShareCard
          recap={pendingRecap}
          primaryColor={partnerBrandPrimary}
          open
          onOpenChange={(next) => {
            if (!next) setPendingRecap(null);
          }}
        />
      ) : null}

      {(startRound.isPending ||
        completeRound.isPending ||
        startBracketOnCourt.isPending ||
        finalizeBracketScore.isPending ||
        startGroupOnCourt.isPending ||
        finalizeGroupScore.isPending) && <LoadingOverlay show />}
    </div>
  );
}
