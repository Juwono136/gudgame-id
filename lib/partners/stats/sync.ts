import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerPlayerMatches,
  partnerPlayerTournamentResults,
} from "@/db/schema/partner-players";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";
import {
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import { resolveTeamMembersByTeamIds } from "@/lib/tournaments/members/resolve-team-members";
import type { TournamentDetail } from "@/lib/tournaments/service";

/**
 * Partner-only history writer — mirrors lib/tournaments/stats/sync.ts but
 * writes exclusively to partner_player_matches / partner_player_tournament_results.
 * NEVER touches player_matches / player_tournament_results (Gud Game career tables).
 */

type PartnerTournamentRef = Pick<
  TournamentDetail,
  "id" | "partnerId" | "sportId" | "name" | "categoryLabel" | "startsAt" | "endsAt"
>;

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
  tournament: PartnerTournamentRef;
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
  tournament: PartnerTournamentRef;
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

/**
 * Reconcile a player's W/L history from completed partner tournament fixtures.
 * Safe to call on detail/list reads — replace-sync avoids double counting.
 */
export async function rebuildPartnerPlayerStatsFromCompletedMatches(input: {
  partnerId: string;
  playerId: string;
}): Promise<void> {
  const db = getDb();

  const teamRows = await db
    .select({
      teamId: tournamentTeams.id,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      sportId: tournaments.sportId,
      categoryLabel: tournaments.categoryLabel,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      partnerId: tournaments.partnerId,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeams.id, tournamentTeamMembers.teamId))
    .innerJoin(tournaments, eq(tournaments.id, tournamentTeams.tournamentId))
    .where(
      and(
        eq(tournamentTeamMembers.partnerPlayerId, input.playerId),
        eq(tournaments.partnerId, input.partnerId),
      ),
    );

  if (!teamRows.length) return;

  const teamIds = [...new Set(teamRows.map((r) => r.teamId))];
  const tournamentsById = new Map(
    teamRows.map((r) => [
      r.tournamentId,
      {
        id: r.tournamentId,
        partnerId: r.partnerId!,
        sportId: r.sportId,
        name: r.tournamentName,
        categoryLabel: r.categoryLabel,
        startsAt: r.startsAt?.toISOString() ?? null,
        endsAt: r.endsAt?.toISOString() ?? null,
      } satisfies PartnerTournamentRef,
    ]),
  );

  // Ensure roster appearances appear in history without downgrading Champion/etc.
  for (const t of tournamentsById.values()) {
    const membersByTeam = await resolveTeamMembersByTeamIds(
      teamRows.filter((r) => r.tournamentId === t.id).map((r) => r.teamId),
    );
    const year = t.startsAt ? new Date(t.startsAt).getFullYear() : new Date().getFullYear();
    const playedAt = t.endsAt ? new Date(t.endsAt) : new Date();

    for (const members of membersByTeam.values()) {
      for (const member of members.filter((m) => m.kind === "partner")) {
        if (member.playerId !== input.playerId) continue;
        const [existing] = await db
          .select({ id: partnerPlayerTournamentResults.id })
          .from(partnerPlayerTournamentResults)
          .where(
            and(
              eq(partnerPlayerTournamentResults.partnerPlayerId, member.playerId),
              eq(partnerPlayerTournamentResults.tournamentId, t.id),
            ),
          )
          .limit(1);
        if (existing) continue;
        await db.insert(partnerPlayerTournamentResults).values({
          partnerPlayerId: member.playerId,
          partnerId: t.partnerId!,
          sportId: t.sportId,
          tournamentId: t.id,
          year,
          tournamentName: t.name,
          category: t.categoryLabel,
          placement: "Competed",
          placementRank: null,
          playedAt,
        });
      }
    }
  }

  const [bracketRows, groupRows, reclubRows] = await Promise.all([
    db
      .select({
        tournamentId: tournamentBracketMatches.tournamentId,
        teamAId: tournamentBracketMatches.teamAId,
        teamBId: tournamentBracketMatches.teamBId,
        teamAName: tournamentBracketMatches.teamAName,
        teamBName: tournamentBracketMatches.teamBName,
        scoreA: tournamentBracketMatches.scoreA,
        scoreB: tournamentBracketMatches.scoreB,
        roundNumber: tournamentBracketMatches.roundNumber,
        completedAt: tournamentBracketMatches.completedAt,
      })
      .from(tournamentBracketMatches)
      .where(
        and(
          eq(tournamentBracketMatches.status, "completed"),
          or(
            inArray(tournamentBracketMatches.teamAId, teamIds),
            inArray(tournamentBracketMatches.teamBId, teamIds),
          ),
        ),
      ),
    db
      .select({
        tournamentId: tournamentGroupMatches.tournamentId,
        teamAId: tournamentGroupMatches.teamAId,
        teamBId: tournamentGroupMatches.teamBId,
        teamAName: tournamentGroupMatches.teamAName,
        teamBName: tournamentGroupMatches.teamBName,
        scoreA: tournamentGroupMatches.scoreA,
        scoreB: tournamentGroupMatches.scoreB,
        completedAt: tournamentGroupMatches.completedAt,
      })
      .from(tournamentGroupMatches)
      .where(
        and(
          eq(tournamentGroupMatches.status, "completed"),
          or(
            inArray(tournamentGroupMatches.teamAId, teamIds),
            inArray(tournamentGroupMatches.teamBId, teamIds),
          ),
        ),
      ),
    db
      .select({
        tournamentId: tournamentReclubMatches.tournamentId,
        teamAId: tournamentReclubMatches.teamAId,
        teamBId: tournamentReclubMatches.teamBId,
        teamAName: tournamentReclubMatches.teamAName,
        teamBName: tournamentReclubMatches.teamBName,
        scoreA: tournamentReclubMatches.scoreA,
        scoreB: tournamentReclubMatches.scoreB,
        roundNumber: tournamentReclubMatches.roundNumber,
        endedAt: tournamentReclubMatches.endedAt,
      })
      .from(tournamentReclubMatches)
      .where(
        and(
          eq(tournamentReclubMatches.status, "completed"),
          or(
            inArray(tournamentReclubMatches.teamAId, teamIds),
            inArray(tournamentReclubMatches.teamBId, teamIds),
          ),
        ),
      ),
  ]);

  const maxRoundByTournament = new Map<string, number>();
  for (const row of bracketRows) {
    const prev = maxRoundByTournament.get(row.tournamentId) ?? 1;
    maxRoundByTournament.set(row.tournamentId, Math.max(prev, row.roundNumber));
  }

  for (const row of bracketRows) {
    const tournament = tournamentsById.get(row.tournamentId);
    if (!tournament || row.scoreA == null || row.scoreB == null) continue;
    const maxRound = maxRoundByTournament.get(row.tournamentId) ?? row.roundNumber;
    await syncPartnerMatchResult({
      tournament,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      round: getBracketRoundLabel(row.roundNumber, maxRound),
      playedAt: row.completedAt ?? undefined,
    });
  }

  for (const row of groupRows) {
    const tournament = tournamentsById.get(row.tournamentId);
    if (!tournament || row.scoreA == null || row.scoreB == null) continue;
    await syncPartnerMatchResult({
      tournament,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      round: "Group stage",
      playedAt: row.completedAt ?? undefined,
    });
  }

  for (const row of reclubRows) {
    const tournament = tournamentsById.get(row.tournamentId);
    if (!tournament || row.scoreA == null || row.scoreB == null) continue;
    await syncPartnerMatchResult({
      tournament,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      round: `Round ${row.roundNumber}`,
      playedAt: row.endedAt ?? undefined,
    });
  }
}
