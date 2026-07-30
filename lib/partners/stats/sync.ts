import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerPlayerMatches,
  partnerPlayerTournamentResults,
} from "@/db/schema/partner-players";
import { resolveTeamMembersByTeamIds } from "@/lib/tournaments/members/resolve-team-members";
import type { TournamentDetail } from "@/lib/tournaments/service";

/**
 * Partner-only history writer — mirrors lib/tournaments/stats/sync.ts but
 * writes exclusively to partner_player_matches / partner_player_tournament_results.
 * NEVER touches player_matches / player_tournament_results (Gud Game career tables).
 */

type PartnerMatchHistoryInsert = {
  partnerPlayerId: string;
  partnerId: string;
  sportId: string;
  tournamentId: string;
  tournamentName: string;
  opponents: string;
  resultType: "win" | "loss";
  score: string;
  round: string;
  playedAt: Date;
};

/** Replace a prior sync for the same fixture so rescoring does not double-count. */
async function replacePartnerMatchHistoryEntry(input: PartnerMatchHistoryInsert): Promise<void> {
  const db = getDb();
  await db
    .delete(partnerPlayerMatches)
    .where(
      and(
        eq(partnerPlayerMatches.partnerPlayerId, input.partnerPlayerId),
        eq(partnerPlayerMatches.tournamentId, input.tournamentId),
        eq(partnerPlayerMatches.round, input.round),
        eq(partnerPlayerMatches.opponents, input.opponents),
      ),
    );
  await db.insert(partnerPlayerMatches).values(input);
}

export async function syncPartnerMatchResult(input: {
  tournament: TournamentDetail;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number;
  scoreB: number;
  round: string;
  playedAt?: Date;
}): Promise<void> {
  const { tournament, teamAId, teamBId, teamAName, teamBName, scoreA, scoreB, round, playedAt } =
    input;
  // Partner-only sync — Gud Game (non-partner) tournaments never touch these tables.
  if (!tournament.partnerId) return;

  const teamIds = [teamAId, teamBId].filter((id): id is string => id != null);
  if (!teamIds.length) return;

  const membersByTeam = await resolveTeamMembersByTeamIds(teamIds);
  const teamAPartnerIds = (teamAId ? (membersByTeam.get(teamAId) ?? []) : [])
    .filter((m) => m.kind === "partner")
    .map((m) => m.playerId);
  const teamBPartnerIds = (teamBId ? (membersByTeam.get(teamBId) ?? []) : [])
    .filter((m) => m.kind === "partner")
    .map((m) => m.playerId);

  if (!teamAPartnerIds.length && !teamBPartnerIds.length) return;

  const scoreLabel = `${scoreA}–${scoreB}`;
  const opponents = [teamAName, teamBName].filter(Boolean).join(" vs ") || "Match";
  const teamAWin = scoreA > scoreB;
  const teamBWin = scoreB > scoreA;
  const resolvedPlayedAt = playedAt ?? new Date();

  for (const partnerPlayerId of teamAPartnerIds) {
    await replacePartnerMatchHistoryEntry({
      partnerPlayerId,
      partnerId: tournament.partnerId,
      sportId: tournament.sportId,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      opponents,
      resultType: teamAWin ? "win" : "loss",
      score: scoreLabel,
      round,
      playedAt: resolvedPlayedAt,
    });
  }

  for (const partnerPlayerId of teamBPartnerIds) {
    await replacePartnerMatchHistoryEntry({
      partnerPlayerId,
      partnerId: tournament.partnerId,
      sportId: tournament.sportId,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      opponents,
      resultType: teamBWin ? "win" : "loss",
      score: scoreLabel,
      round,
      playedAt: resolvedPlayedAt,
    });
  }
}

export async function syncPartnerTournamentPlacements(input: {
  tournament: TournamentDetail;
  placements: { teamId: string; placement: string; placementRank: number | null }[];
}): Promise<void> {
  const { tournament, placements } = input;
  if (!tournament.partnerId) return;
  if (!placements.length) return;

  const teamIds = placements.map((p) => p.teamId);
  const membersByTeam = await resolveTeamMembersByTeamIds(teamIds);
  const db = getDb();
  const year = tournament.startsAt
    ? new Date(tournament.startsAt).getFullYear()
    : new Date().getFullYear();
  const playedAt = tournament.endsAt ? new Date(tournament.endsAt) : new Date();

  for (const { teamId, placement, placementRank } of placements) {
    const partnerMembers = (membersByTeam.get(teamId) ?? []).filter((m) => m.kind === "partner");

    for (const member of partnerMembers) {
      const [existing] = await db
        .select({ id: partnerPlayerTournamentResults.id })
        .from(partnerPlayerTournamentResults)
        .where(
          and(
            eq(partnerPlayerTournamentResults.partnerPlayerId, member.playerId),
            eq(partnerPlayerTournamentResults.tournamentId, tournament.id),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(partnerPlayerTournamentResults)
          .set({ placement, placementRank })
          .where(eq(partnerPlayerTournamentResults.id, existing.id));
      } else {
        await db.insert(partnerPlayerTournamentResults).values({
          partnerPlayerId: member.playerId,
          partnerId: tournament.partnerId,
          sportId: tournament.sportId,
          tournamentId: tournament.id,
          year,
          tournamentName: tournament.name,
          category: tournament.categoryLabel,
          placement,
          placementRank,
          playedAt,
        });
      }
    }
  }
}

export async function removePartnerPlacement(
  tournamentId: string,
  partnerPlayerId: string,
): Promise<void> {
  await getDb()
    .delete(partnerPlayerTournamentResults)
    .where(
      and(
        eq(partnerPlayerTournamentResults.tournamentId, tournamentId),
        eq(partnerPlayerTournamentResults.partnerPlayerId, partnerPlayerId),
      ),
    );
}
