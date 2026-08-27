import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { tournamentTeamMembers } from "@/db/schema/tournament-registration";
import { buildTournamentLeaderboard } from "@/lib/tournaments/brackets/leaderboard";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import { listBracketMatches, type BracketMatchView } from "@/lib/tournaments/brackets/service";
import { isFunMatchType, supportsRoundBasedPlay } from "@/lib/tournaments/core/types";
import {
  getTournamentLivePhase,
  shouldExposeBracketPublicData,
  shouldExposeGroupStagePublicData,
  shouldExposeLivePublicData,
} from "@/lib/tournaments/lifecycle-guards";
import { getFormatCapabilities } from "@/lib/tournaments/format-capabilities";
import {
  buildDoubleStageOverview,
  listGroupMatches,
  reconcileDoubleStageGroups,
} from "@/lib/tournaments/double-stage/service";
import {
  isTournamentLivePhaseTerminal,
  normalizeBracketMatchesForDisplay,
  normalizeReclubMatchesForDisplay,
} from "@/lib/tournaments/match-display-status";
import { TOURNAMENT_NOT_STARTED_MESSAGE } from "@/lib/tournaments/core/types";
import { listReclubMatches } from "@/lib/tournaments/reclub/matches";
import { dedupeReclubMatchViews } from "@/lib/tournaments/reclub/round-groups";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { provisionTournamentCourts } from "@/lib/tournaments/courts/service";
import {
  getTournamentDisplayConfig,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentRoundDurationMinutes,
  getTournamentScoringType,
  isClassicSetsFormat,
} from "@/lib/tournaments/settings";
import { computeReclubSessionStatsWithBracket } from "@/lib/tournaments/stats/from-reclub";
import { resolveBracketMatchDurationSeconds } from "@/lib/tournaments/stats/bracket-duration";
import { computeTournamentSessionStats } from "@/lib/tournaments/stats/compute";
import { toStatsMatchFromGroup } from "@/lib/tournaments/stats/from-group";
import type { StatsMatchInput, TournamentSessionStats } from "@/lib/tournaments/stats/types";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";

function mapGroupToLiveMatch(m: GroupMatchView) {
  return {
    id: m.id,
    type: "group_stage" as const,
    groupId: m.groupId,
    roundNumber: m.roundNumber > 0 ? m.roundNumber : 1,
    roundLabel: `Round ${m.roundNumber > 0 ? m.roundNumber : 1}`,
    matchNumber: m.matchNumber,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: m.status,
    startedAt: m.startedAt,
    endedAt: m.completedAt,
    courtId: m.courtId,
    teamAPlayers: (m.teamAPlayers ?? []).map((p) => p.displayName).filter(Boolean),
    teamBPlayers: (m.teamBPlayers ?? []).map((p) => p.displayName).filter(Boolean),
    playType: "group_stage" as const,
    scoreEvents: m.scoreEvents ?? [],
    gameState: m.gameState ?? null,
  };
}

function mapReclubToLiveMatch(m: ReclubMatchView) {
  return {
    id: m.id,
    type: "lobby_round" as const,
    roundNumber: m.roundNumber,
    roundLabel: historyLabelForReclub(m),
    teamAId: m.teamAId ?? null,
    teamBId: m.teamBId ?? null,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    teamAPlayers: m.teamAPlayers,
    teamBPlayers: m.teamBPlayers,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: m.status,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    courtId: m.courtId,
    timerEndsAt: m.timerEndsAt,
    playType: m.playType ?? null,
    playNumber: m.playNumber ?? null,
    durationSeconds: m.durationSeconds,
    bracketMatchId: m.bracketMatchId ?? null,
    gameState: m.gameState ?? null,
  };
}

function historyLabelForReclub(m: ReclubMatchView): string {
  if (m.playType === "friendly") {
    return m.playNumber ? `Friendly #${m.playNumber}` : "Friendly";
  }
  if (m.playType === "bracket_rematch") {
    return m.playNumber ? `Bracket rematch #${m.playNumber}` : "Bracket rematch";
  }
  if (m.playType === "bracket" || m.sourceKind === "bracket") {
    return m.roundLabel ?? `Bracket · R${m.roundNumber}`;
  }
  return m.roundLabel ?? `Round ${m.roundNumber}`;
}

function historyLabelForBracket(m: BracketMatchView, maxRound: number): string {
  return `Bracket · ${getBracketRoundLabel(m.roundNumber, maxRound)} · M${m.matchNumber}`;
}

function mapBracketToLiveMatch(m: BracketMatchView) {
  return {
    id: m.id,
    type: "bracket" as const,
    roundNumber: m.roundNumber,
    matchNumber: m.matchNumber,
    teamAId: m.teamAId ?? null,
    teamBId: m.teamBId ?? null,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    teamAPlayers: m.teamAPlayers,
    teamBPlayers: m.teamBPlayers,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: m.status,
    courtId: m.courtId,
    startedAt: m.startedAt,
    endedAt: null,
    bracketMatchId: m.id,
    scoreEvents: m.scoreEvents ?? [],
    gameState: m.gameState ?? null,
  };
}

function toStatsMatchFromReclub(m: ReclubMatchView): StatsMatchInput | null {
  if (!m.teamAName || !m.teamBName) return null;
  return {
    id: m.id,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    teamAId: m.teamAId ?? null,
    teamBId: m.teamBId ?? null,
    scoreA: m.scoreA ?? 0,
    scoreB: m.scoreB ?? 0,
    status: m.status,
    durationSeconds: m.durationSeconds,
  };
}

function toStatsMatchFromBracket(m: BracketMatchView): StatsMatchInput | null {
  if (!m.teamAName || !m.teamBName) return null;
  return {
    id: m.id,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    scoreA: m.scoreA ?? 0,
    scoreB: m.scoreB ?? 0,
    status: m.status,
    durationSeconds: resolveBracketMatchDurationSeconds(m),
  };
}

export async function buildTournamentLivePayload(
  tournament: TournamentDetail,
): Promise<TournamentLivePayload> {
  const phase = getTournamentLivePhase(tournament);
  const isLiveOrDone = shouldExposeLivePublicData(tournament);
  const tournamentEnded = isTournamentLivePhaseTerminal(phase);

  const caps = getFormatCapabilities(tournament);
  const isFunMatch = isFunMatchType(tournament.tournamentType);
  const includeBracket = shouldExposeBracketPublicData(tournament);
  const includeGroupStage = shouldExposeGroupStagePublicData(tournament);
  // Prefer format capabilities so Mexicano / Americano Official stay on lobby rounds.
  const includeLobbyRounds =
    caps.hasLobbyRounds || supportsRoundBasedPlay(tournament);

  if (includeGroupStage) {
    await reconcileDoubleStageGroups(tournament);
  }

  const db = getDb();
  const [bracketMatchesRaw, leaderboard, teams, lobbyMatchesRaw, courts, groupMatchesRaw, doubleStageOverview] =
    await Promise.all([
    includeBracket ? listBracketMatches(tournament.id) : Promise.resolve([]),
    includeBracket ? buildTournamentLeaderboard(tournament.id) : Promise.resolve([]),
    listLobbyTeamsDetailed(tournament.id),
    includeLobbyRounds ? listReclubMatches(tournament.id) : Promise.resolve([]),
    provisionTournamentCourts(tournament),
    includeGroupStage ? listGroupMatches(tournament.id) : Promise.resolve([]),
    includeGroupStage ? buildDoubleStageOverview(tournament) : Promise.resolve(null),
  ]);

  const bracketMatches = normalizeBracketMatchesForDisplay(
    bracketMatchesRaw,
    tournament.status,
  );
  const lobbyMatches = normalizeReclubMatchesForDisplay(
    lobbyMatchesRaw,
    tournament.status,
  );

  const teamIds = teams.map((t) => t.id);
  const members =
    teamIds.length > 0
      ? await db
          .select({
            teamId: tournamentTeamMembers.teamId,
            userId: tournamentTeamMembers.userId,
            partnerPlayerId: tournamentTeamMembers.partnerPlayerId,
            role: tournamentTeamMembers.role,
            slotIndex: tournamentTeamMembers.slotIndex,
            name: user.name,
            image: user.image,
            nickname: user.nickname,
            partnerFullName: partnerPlayers.fullName,
          })
          .from(tournamentTeamMembers)
          .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
          .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
          .where(inArray(tournamentTeamMembers.teamId, teamIds))
      : [];

  const players = teams.flatMap((team) => ({
    teamId: team.id,
    teamName: team.name,
    members: members
      .filter((m) => m.teamId === team.id)
      .map((m) => ({
        userId: (m.userId ?? m.partnerPlayerId)!,
        name: m.userId ? (m.nickname ?? m.name) : (m.partnerFullName ?? "Guest"),
        image: m.image,
        role: m.role,
        slotIndex: m.slotIndex,
      })),
  }));

  // Include pending/queued fixtures so public Live Score round tabs match Manage
  // (completedCount / isComplete per RR day). Live + completed alone collapsed
  // all rows onto round 1 when roundNumber was missing historically.
  const groupSessionMatches =
    isLiveOrDone && includeGroupStage && caps.hasGroupStage
      ? groupMatchesRaw
          .filter(
            (m) =>
              m.status === "in_progress" ||
              m.status === "completed" ||
              m.status === "pending" ||
              m.status === "scheduled",
          )
          .map(mapGroupToLiveMatch)
      : [];

  const lobbyLiveMatches =
    isLiveOrDone && !tournamentEnded
      ? lobbyMatches.filter((m) => m.status === "in_progress").map(mapReclubToLiveMatch)
      : [];
  const bracketLiveMatches =
    isLiveOrDone && !tournamentEnded
      ? bracketMatches.filter((m) => m.status === "in_progress").map(mapBracketToLiveMatch)
      : [];

  const lobbyBracketIds = new Set(
    lobbyMatches.map((m) => m.bracketMatchId ?? (m.sourceKind === "bracket" ? m.id : null)).filter(Boolean),
  );

  const bracketLiveNotInLobby = bracketLiveMatches.filter((m) => !lobbyBracketIds.has(m.id));

  const activeLiveMatches = includeGroupStage && caps.hasGroupStage
    ? groupSessionMatches
    : includeLobbyRounds
      ? isFunMatch
        ? lobbyLiveMatches
        : [...lobbyLiveMatches, ...bracketLiveNotInLobby]
      : bracketLiveMatches;

  // Americano / lobby-round fun matches. Do not use an empty [] here — partner
  // double_stage events are typed fun_match but live on group_stage tables.
  const funMatchLobbySessionMatches =
    isLiveOrDone && isFunMatch && includeLobbyRounds
      ? dedupeReclubMatchViews(
          lobbyMatches.filter((m) => m.status === "in_progress" || m.status === "completed"),
        ).map(mapReclubToLiveMatch)
      : null;

  const matchesPayload =
    funMatchLobbySessionMatches && funMatchLobbySessionMatches.length > 0
      ? funMatchLobbySessionMatches
      : activeLiveMatches;

  const maxBracketRound = bracketMatches.length
    ? Math.max(...bracketMatches.map((m) => m.roundNumber))
    : 1;

  const recordedBracketIds = new Set(
    lobbyMatches
      .filter((m) => m.bracketMatchId && m.status === "completed")
      .map((m) => `${m.bracketMatchId}-${m.playNumber ?? 1}`),
  );

  const lobbyHistory = lobbyMatches
    .filter((m) => m.status === "completed")
    .map((m) => ({
      id: m.id,
      label: historyLabelForReclub(m),
      summary: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
      score: `${m.scoreA ?? 0}–${m.scoreB ?? 0}`,
      endedAt: m.endedAt,
      playType: m.playType ?? null,
      roundNumber: m.roundNumber,
      teamAId: m.teamAId ?? null,
      teamBId: m.teamBId ?? null,
      teamAName: m.teamAName ?? null,
      teamBName: m.teamBName ?? null,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
    }))
    .sort((a, b) => {
      const at = new Date(a.endedAt ?? 0).getTime();
      const bt = new Date(b.endedAt ?? 0).getTime();
      return bt - at;
    });

  const bracketHistory = bracketMatches
    .filter(
      (m) =>
        m.status === "completed" &&
        !recordedBracketIds.has(`${m.id}-1`) &&
        (m.teamAName || m.teamBName),
    )
    .map((m) => ({
      id: m.id,
      label: historyLabelForBracket(m, maxBracketRound),
      summary: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
      score: `${m.scoreA ?? 0}–${m.scoreB ?? 0}`,
      endedAt: m.completedAt,
      playType: "bracket" as const,
      roundNumber: m.roundNumber,
      teamAId: m.teamAId ?? null,
      teamBId: m.teamBId ?? null,
      teamAName: m.teamAName ?? null,
      teamBName: m.teamBName ?? null,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      bracketMatchId: m.id,
    }));

  const groupHistory = groupMatchesRaw
    .filter((m) => m.status === "completed")
    .map((m) => {
      const round = m.roundNumber > 0 ? m.roundNumber : 1;
      return {
        id: m.id,
        label: `Group stage · Round ${round}`,
        summary: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
        score: `${m.scoreA ?? 0}–${m.scoreB ?? 0}`,
        endedAt: m.completedAt,
        playType: "group_stage" as const,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        teamAPlayers: m.teamAPlayers.map((p) => p.displayName).filter(Boolean),
        teamBPlayers: m.teamBPlayers.map((p) => p.displayName).filter(Boolean),
        scoreEvents: m.scoreEvents,
      };
    });

  const matchHistory = [...groupHistory, ...lobbyHistory, ...bracketHistory].sort((a, b) => {
    const at = new Date(a.endedAt ?? 0).getTime();
    const bt = new Date(b.endedAt ?? 0).getTime();
    return bt - at;
  });

  const statsMatches: StatsMatchInput[] = [
    ...lobbyMatches.map(toStatsMatchFromReclub).filter((m): m is StatsMatchInput => m != null),
    ...bracketMatches.map(toStatsMatchFromBracket).filter((m): m is StatsMatchInput => m != null),
    ...(includeGroupStage
      ? groupMatchesRaw
          .map(toStatsMatchFromGroup)
          .filter((m): m is StatsMatchInput => m != null)
      : []),
  ];

  const statsTeams = teams
    .filter((t) => t.memberCount > 0)
    .map((t) => ({ id: t.id, name: t.name, memberCount: t.memberCount }));

  const sessionStats: TournamentSessionStats = isFunMatch
    ? computeReclubSessionStatsWithBracket({
        reclubMatches: lobbyMatches,
        bracketMatches,
        teams,
        totalPlayers: members.length,
        maxRounds: null,
      })
    : computeTournamentSessionStats({
        matches: statsMatches,
        teams: statsTeams,
        totalPlayers: members.length,
      });

  return {
    phase,
    message: isLiveOrDone ? undefined : TOURNAMENT_NOT_STARTED_MESSAGE,
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      sportSlug: tournament.sportSlug,
      status: tournament.status,
      tournamentType: tournament.tournamentType,
      officialBilling: tournament.officialBilling ?? null,
      format: tournament.format,
      venue: tournament.venue,
      categoryLabel: tournament.categoryLabel,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
    },
    courts,
    displayConfig: getTournamentDisplayConfig(tournament),
    players,
    bracket: {
      matches: bracketMatches,
      leaderboard,
      generated: bracketMatches.length > 0,
    },
    matches: matchesPayload,
    scoring: (() => {
      const stage =
        doubleStageOverview?.phase === "knockout"
          ? "knockout"
          : doubleStageOverview
            ? "group"
            : "default";
      const roundDurationMinutes =
        getTournamentScoringType(tournament) === "timed"
          ? getTournamentRoundDurationMinutes(tournament)
          : 45;
      const matchScoreMode = getTournamentMatchScoreMode(tournament, stage);
      const classicSets = isClassicSetsFormat(tournament, stage);
      if (matchScoreMode !== "games") {
        return { matchScoreMode, roundDurationMinutes, classicSets };
      }
      const rules = getTournamentGameRules(tournament, stage);
      return {
        matchScoreMode,
        raceToGames: rules.raceToGames,
        lengthMode: rules.lengthMode ?? "race_to",
        pointsToWinGame: rules.pointsToWinGame,
        pointStyle: rules.pointStyle,
        roundDurationMinutes,
        classicSets,
      };
    })(),
    matchHistory:
      includeGroupStage && !includeLobbyRounds
        ? [...groupHistory, ...bracketHistory].sort((a, b) => {
            const at = new Date(a.endedAt ?? 0).getTime();
            const bt = new Date(b.endedAt ?? 0).getTime();
            return bt - at;
          })
        : includeLobbyRounds
          ? matchHistory
          : bracketHistory,
    leaderboard,
    doubleStage: doubleStageOverview
      ? {
          phase: doubleStageOverview.phase,
          groups: doubleStageOverview.groups,
          knockoutReady: doubleStageOverview.knockoutReady,
          allGroupMatchesCompleted: doubleStageOverview.allGroupMatchesCompleted,
          qualifiedCount: doubleStageOverview.qualifiedCount,
        }
      : undefined,
    playerStats: sessionStats,
    lastUpdatedAt: new Date().toISOString(),
  };
}
