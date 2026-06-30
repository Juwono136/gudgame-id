import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentTeamMembers } from "@/db/schema/tournament-registration";
import { buildTournamentLeaderboard } from "@/lib/tournaments/brackets/leaderboard";
import { listBracketMatches, type BracketMatchView } from "@/lib/tournaments/brackets/service";
import { isFunMatchType, supportsRoundBasedPlay } from "@/lib/tournaments/core/types";
import {
  getTournamentLivePhase,
  shouldExposeLivePublicData,
} from "@/lib/tournaments/lifecycle-guards";
import { TOURNAMENT_NOT_STARTED_MESSAGE } from "@/lib/tournaments/core/types";
import { listReclubMatches } from "@/lib/tournaments/reclub/matches";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { provisionTournamentCourts } from "@/lib/tournaments/courts/service";
import { getTournamentDisplayConfig } from "@/lib/tournaments/settings";
import { computeReclubSessionStatsWithBracket } from "@/lib/tournaments/stats/from-reclub";
import { computeTournamentSessionStats } from "@/lib/tournaments/stats/compute";
import type { StatsMatchInput, TournamentSessionStats } from "@/lib/tournaments/stats/types";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";

function mapReclubToLiveMatch(m: ReclubMatchView) {
  return {
    id: m.id,
    type: "lobby_round" as const,
    roundNumber: m.roundNumber,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: m.status,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    courtId: m.courtId,
    timerEndsAt: m.timerEndsAt,
  };
}

function mapBracketToLiveMatch(m: BracketMatchView) {
  return {
    id: m.id,
    type: "bracket" as const,
    roundNumber: m.roundNumber,
    matchNumber: m.matchNumber,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    teamAPlayers: m.teamAPlayers,
    teamBPlayers: m.teamBPlayers,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: m.status,
    courtId: m.courtId,
    startedAt: m.startedAt,
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
    durationSeconds: null,
  };
}

export async function buildTournamentLivePayload(
  tournament: TournamentDetail,
): Promise<TournamentLivePayload> {
  const phase = getTournamentLivePhase(tournament);
  const isLiveOrDone = shouldExposeLivePublicData(tournament);

  const isFunMatch = isFunMatchType(tournament.tournamentType);
  const includeBracket = tournament.format !== "americano";
  const includeLobbyRounds = supportsRoundBasedPlay(tournament);

  const db = getDb();
  const [bracketMatches, leaderboard, teams, lobbyMatches, courts] = await Promise.all([
    includeBracket ? listBracketMatches(tournament.id) : Promise.resolve([]),
    includeBracket ? buildTournamentLeaderboard(tournament.id) : Promise.resolve([]),
    listLobbyTeamsDetailed(tournament.id),
    includeLobbyRounds ? listReclubMatches(tournament.id) : Promise.resolve([]),
    provisionTournamentCourts(tournament),
  ]);

  const teamIds = teams.map((t) => t.id);
  const members =
    teamIds.length > 0
      ? await db
          .select({
            teamId: tournamentTeamMembers.teamId,
            userId: tournamentTeamMembers.userId,
            role: tournamentTeamMembers.role,
            slotIndex: tournamentTeamMembers.slotIndex,
            name: user.name,
            image: user.image,
            nickname: user.nickname,
          })
          .from(tournamentTeamMembers)
          .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
          .where(inArray(tournamentTeamMembers.teamId, teamIds))
      : [];

  const players = teams.flatMap((team) => ({
    teamId: team.id,
    teamName: team.name,
    members: members
      .filter((m) => m.teamId === team.id)
      .map((m) => ({
        userId: m.userId,
        name: m.nickname ?? m.name,
        image: m.image,
        role: m.role,
        slotIndex: m.slotIndex,
      })),
  }));

  const lobbyLiveMatches = isLiveOrDone ? lobbyMatches.map(mapReclubToLiveMatch) : [];
  const bracketLiveMatches = isLiveOrDone ? bracketMatches.map(mapBracketToLiveMatch) : [];

  const liveMatches = includeLobbyRounds
    ? [...lobbyLiveMatches, ...bracketLiveMatches]
    : bracketLiveMatches;

  const statsMatches: StatsMatchInput[] = [
    ...lobbyMatches.map(toStatsMatchFromReclub).filter((m): m is StatsMatchInput => m != null),
    ...bracketMatches.map(toStatsMatchFromBracket).filter((m): m is StatsMatchInput => m != null),
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

  const lobbyHistory = lobbyMatches
    .filter((m) => m.status === "completed")
    .map((m) => ({
      id: m.id,
      label: m.roundLabel ?? `Round ${m.roundNumber}`,
      summary: m.summary,
      score: `${m.scoreA ?? 0}–${m.scoreB ?? 0}`,
      endedAt: m.endedAt,
    }));

  const bracketHistory = bracketMatches
    .filter((m) => m.status === "completed")
    .map((m) => ({
      id: m.id,
      label: `Round ${m.roundNumber} · Match ${m.matchNumber}`,
      summary: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
      score: `${m.scoreA ?? 0}–${m.scoreB ?? 0}`,
      endedAt: null,
    }));

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
    matches: liveMatches,
    matchHistory: includeLobbyRounds
      ? [...lobbyHistory, ...bracketHistory]
      : bracketHistory,
    leaderboard,
    playerStats: sessionStats,
    lastUpdatedAt: new Date().toISOString(),
  };
}
