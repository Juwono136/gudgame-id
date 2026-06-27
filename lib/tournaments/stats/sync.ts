import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  playerMatches,
  playerTournamentResults,
} from "@/db/schema/player-competition";
import type { tournamentReclubMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers } from "@/db/schema/tournament-registration";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { deriveStatsTier } from "@/lib/tournaments/stats/tier";
import { syncPlayerWikiPerformanceSafe } from "@/lib/account/player-performance/sync-wiki";

type ReclubMatchRow = typeof tournamentReclubMatches.$inferSelect;

function statsTierFor(tournament: TournamentDetail) {
  return deriveStatsTier({
    tournamentType: tournament.tournamentType,
    officialBilling: tournament.officialBilling,
  });
}

export async function syncReclubMatchToPlayerHistory(input: {
  tournament: TournamentDetail;
  match: ReclubMatchRow;
  participantUserIds: string[];
}): Promise<void> {
  const { tournament, match, participantUserIds } = input;
  if (!participantUserIds.length || !isFunMatchType(tournament.tournamentType)) return;

  const db = getDb();
  const tier = statsTierFor(tournament);
  const scoreLabel = `${match.scoreA ?? 0}–${match.scoreB ?? 0}`;
  const opponents = [match.teamAName, match.teamBName].filter(Boolean).join(" vs ");
  const playedAt = match.endedAt ?? match.startedAt ?? new Date();

  const teamIds = [match.teamAId, match.teamBId].filter((id): id is string => id != null);
  const membership =
    teamIds.length > 0
      ? await db
          .select({
            userId: tournamentTeamMembers.userId,
            teamId: tournamentTeamMembers.teamId,
          })
          .from(tournamentTeamMembers)
          .where(
            and(
              inArray(tournamentTeamMembers.teamId, teamIds),
              inArray(tournamentTeamMembers.userId, participantUserIds),
            ),
          )
      : [];

  const teamAWin = (match.scoreA ?? 0) > (match.scoreB ?? 0);
  const teamBWin = (match.scoreB ?? 0) > (match.scoreA ?? 0);

  for (const userId of participantUserIds) {
    const userTeam = membership.find((m) => m.userId === userId)?.teamId;
    let resultType: "win" | "loss" = "loss";
    if (userTeam === match.teamAId && teamAWin) resultType = "win";
    if (userTeam === match.teamBId && teamBWin) resultType = "win";
    if (!teamAWin && !teamBWin) resultType = "loss";

    await db.insert(playerMatches).values({
      userId,
      sportId: tournament.sportId,
      tournamentId: tournament.id,
      isOfficial: false,
      statsTier: tier,
      tournamentName: tournament.name,
      opponents: opponents || "Fun Match session",
      resultType,
      score: scoreLabel,
      round: `Round ${match.roundNumber}`,
      playedAt,
    });
    await syncPlayerWikiPerformanceSafe(userId, tournament.sportId);
  }
}

export async function syncOfficialMatchToPlayerHistory(input: {
  tournament: TournamentDetail;
  roundLabel: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  participantUserIds: string[];
}): Promise<void> {
  const {
    tournament,
    roundLabel,
    teamAName,
    teamBName,
    teamAId,
    teamBId,
    scoreA,
    scoreB,
    participantUserIds,
  } = input;
  if (!participantUserIds.length || !tournament.tournamentType || tournament.tournamentType !== "official") {
    return;
  }

  const db = getDb();
  const tier = statsTierFor(tournament);
  const scoreLabel = `${scoreA}–${scoreB}`;
  const opponents = [teamAName, teamBName].filter(Boolean).join(" vs ");
  const playedAt = new Date();
  const teamAWin = scoreA > scoreB;
  const teamBWin = scoreB > scoreA;

  const membership =
    teamAId != null || teamBId != null
      ? await db
          .select({
            userId: tournamentTeamMembers.userId,
            teamId: tournamentTeamMembers.teamId,
          })
          .from(tournamentTeamMembers)
          .where(
            and(
              inArray(tournamentTeamMembers.userId, participantUserIds),
              teamAId != null && teamBId != null
                ? inArray(tournamentTeamMembers.teamId, [teamAId, teamBId])
                : teamAId != null
                  ? eq(tournamentTeamMembers.teamId, teamAId)
                  : eq(tournamentTeamMembers.teamId, teamBId!),
            ),
          )
      : [];

  for (const userId of participantUserIds) {
    const userTeam = membership.find((m) => m.userId === userId)?.teamId;
    let resultType: "win" | "loss" = "loss";
    if (userTeam === teamAId && teamAWin) resultType = "win";
    if (userTeam === teamBId && teamBWin) resultType = "win";

    await db.insert(playerMatches).values({
      userId,
      sportId: tournament.sportId,
      tournamentId: tournament.id,
      isOfficial: true,
      statsTier: tier,
      tournamentName: tournament.name,
      opponents: opponents || "Bracket match",
      resultType,
      score: scoreLabel,
      round: roundLabel,
      playedAt,
    });
    await syncPlayerWikiPerformanceSafe(userId, tournament.sportId);
  }
}

export async function syncReclubParticipation(input: {
  tournament: TournamentDetail;
  userId: string;
  role: "organizer" | "participant";
}): Promise<void> {
  const { tournament, userId, role } = input;
  if (!isFunMatchType(tournament.tournamentType)) return;

  const db = getDb();
  const tier = statsTierFor(tournament);
  const [existing] = await db
    .select({ id: playerTournamentResults.id })
    .from(playerTournamentResults)
    .where(
      and(
        eq(playerTournamentResults.userId, userId),
        eq(playerTournamentResults.tournamentId, tournament.id),
      ),
    )
    .limit(1);

  if (existing) return;

  const year = tournament.startsAt
    ? new Date(tournament.startsAt).getFullYear()
    : new Date().getFullYear();

  const placement = role === "organizer" ? "Organizer" : "Participant";

  await db.insert(playerTournamentResults).values({
    userId,
    sportId: tournament.sportId,
    tournamentId: tournament.id,
    isOfficial: false,
    statsTier: tier,
    year,
    tournamentName: tournament.name,
    category: "Fun Match",
    placement,
    placementRank: role === "organizer" ? 0 : null,
    playedAt: tournament.startsAt ? new Date(tournament.startsAt) : new Date(),
  });
}

export async function syncReclubBracketResult(input: {
  tournament: TournamentDetail;
  roundLabel: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  participantUserIds: string[];
  placement?: string;
}): Promise<void> {
  const {
    tournament,
    roundLabel,
    teamAName,
    teamBName,
    teamAId,
    teamBId,
    scoreA,
    scoreB,
    participantUserIds,
    placement,
  } = input;
  if (!participantUserIds.length) return;

  const db = getDb();
  const tier = statsTierFor(tournament);
  const scoreLabel = `${scoreA}–${scoreB}`;
  const opponents = [teamAName, teamBName].filter(Boolean).join(" vs ");
  const playedAt = new Date();
  const teamAWin = scoreA > scoreB;
  const teamBWin = scoreB > scoreA;

  const membership =
    teamAId != null || teamBId != null
      ? await db
          .select({
            userId: tournamentTeamMembers.userId,
            teamId: tournamentTeamMembers.teamId,
          })
          .from(tournamentTeamMembers)
          .where(
            and(
              inArray(tournamentTeamMembers.userId, participantUserIds),
              teamAId != null && teamBId != null
                ? inArray(tournamentTeamMembers.teamId, [teamAId, teamBId])
                : teamAId != null
                  ? eq(tournamentTeamMembers.teamId, teamAId)
                  : eq(tournamentTeamMembers.teamId, teamBId!),
            ),
          )
      : [];

  for (const userId of participantUserIds) {
    const userTeam = membership.find((m) => m.userId === userId)?.teamId;
    let resultType: "win" | "loss" = "loss";
    if (userTeam === teamAId && teamAWin) resultType = "win";
    if (userTeam === teamBId && teamBWin) resultType = "win";

    await db.insert(playerMatches).values({
      userId,
      sportId: tournament.sportId,
      tournamentId: tournament.id,
      isOfficial: false,
      statsTier: tier,
      tournamentName: tournament.name,
      opponents: opponents || "Bracket match",
      resultType,
      score: scoreLabel,
      round: roundLabel,
      playedAt,
    });
    await syncPlayerWikiPerformanceSafe(userId, tournament.sportId);

    if (placement && resultType === "win") {
      const year = tournament.startsAt
        ? new Date(tournament.startsAt).getFullYear()
        : new Date().getFullYear();
      const [existing] = await db
        .select({ id: playerTournamentResults.id })
        .from(playerTournamentResults)
        .where(
          and(
            eq(playerTournamentResults.userId, userId),
            eq(playerTournamentResults.tournamentId, tournament.id),
          ),
        )
        .limit(1);
      if (!existing) {
        await db.insert(playerTournamentResults).values({
          userId,
          sportId: tournament.sportId,
          tournamentId: tournament.id,
          isOfficial: false,
          statsTier: tier,
          year,
          tournamentName: tournament.name,
          category: "Fun Match Bracket",
          placement,
          placementRank: 1,
          playedAt,
        });
      } else {
        await db
          .update(playerTournamentResults)
          .set({ placement, placementRank: 1 })
          .where(eq(playerTournamentResults.id, existing.id));
      }
    }
  }
}

export async function syncOfficialPlacement(input: {
  tournament: TournamentDetail;
  userId: string;
  placement: string;
  placementRank: number | null;
  wikiEntityId?: string | null;
}): Promise<void> {
  const { tournament, userId, placement, placementRank, wikiEntityId } = input;
  const tier = statsTierFor(tournament);
  const year = tournament.startsAt
    ? new Date(tournament.startsAt).getFullYear()
    : new Date().getFullYear();

  await getDb().insert(playerTournamentResults).values({
    userId,
    wikiEntityId: wikiEntityId ?? null,
    sportId: tournament.sportId,
    tournamentId: tournament.id,
    isOfficial: true,
    statsTier: tier,
    year,
    tournamentName: tournament.name,
    category: tournament.categoryLabel,
    placement,
    placementRank,
    playedAt: tournament.endsAt ? new Date(tournament.endsAt) : new Date(),
  });
}
