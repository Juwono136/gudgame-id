import "server-only";

import { and, eq, inArray, like, or } from "drizzle-orm";
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
import {
  buildPlayerMatchRoundKey,
  PLAYER_MATCH_FIXTURE_MARKER,
} from "@/lib/tournaments/stats/history-fixture-key";

/**
 * Partner-only history writer — mirrors lib/tournaments/stats/sync.ts but
 * writes exclusively to partner_player_matches / partner_player_tournament_results.
 * NEVER touches player_matches / player_tournament_results (Gud Game career tables).
 */

type PartnerTournamentRef = Pick<
  TournamentDetail,
  "id" | "partnerId" | "sportId" | "name" | "categoryLabel" | "startsAt" | "endsAt"
>;

export type PartnerMatchResultType = "win" | "loss" | "draw";

type PartnerMatchHistoryInsert = {
  partnerPlayerId: string;
  partnerId: string;
  sportId: string | null;
  tournamentId: string | null;
  tournamentName: string;
  opponents: string;
  resultType: PartnerMatchResultType;
  score: string;
  round: string;
  playedAt: Date;
};

/** Replace a prior sync for the same fixture so rescoring does not double-count. */
async function replacePartnerMatchHistoryEntry(
  input: PartnerMatchHistoryInsert,
): Promise<void> {
  const db = getDb();
  await db
    .delete(partnerPlayerMatches)
    .where(
      and(
        eq(partnerPlayerMatches.partnerPlayerId, input.partnerPlayerId),
        input.tournamentId
          ? eq(partnerPlayerMatches.tournamentId, input.tournamentId)
          : eq(partnerPlayerMatches.tournamentName, input.tournamentName),
        eq(partnerPlayerMatches.round, input.round),
      ),
    );
  await db.insert(partnerPlayerMatches).values(input);
}

function resultForSide(
  scoreA: number,
  scoreB: number,
  side: "a" | "b",
): PartnerMatchResultType {
  if (scoreA === scoreB) return "draw";
  const aWins = scoreA > scoreB;
  if (side === "a") return aWins ? "win" : "loss";
  return aWins ? "loss" : "win";
}

export async function syncPartnerMatchResult(input: {
  tournament: PartnerTournamentRef;
  /** Stable match/fixture id — required for idempotent replace-sync. */
  fixtureId: string;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number;
  scoreB: number;
  round: string;
  playedAt?: Date;
}): Promise<void> {
  const {
    tournament,
    fixtureId,
    teamAId,
    teamBId,
    teamAName,
    teamBName,
    scoreA,
    scoreB,
    round,
    playedAt,
  } = input;
  if (!tournament.partnerId) return;
  if (!fixtureId?.trim()) return;

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
  const roundKey = buildPlayerMatchRoundKey(round, fixtureId);
  const resolvedPlayedAt = playedAt ?? new Date();

  for (const partnerPlayerId of teamAPartnerIds) {
    await replacePartnerMatchHistoryEntry({
      partnerPlayerId,
      partnerId: tournament.partnerId,
      sportId: tournament.sportId,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      opponents,
      resultType: resultForSide(scoreA, scoreB, "a"),
      score: scoreLabel,
      round: roundKey,
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
      resultType: resultForSide(scoreA, scoreB, "b"),
      score: scoreLabel,
      round: roundKey,
      playedAt: resolvedPlayedAt,
    });
  }
}

/** Drop partner history rows for a fixture after rematch / void. */
export async function removePartnerMatchHistoryForFixture(input: {
  tournamentId: string;
  fixtureId: string;
  partnerPlayerIds?: string[];
}): Promise<void> {
  if (!input.fixtureId) return;
  const db = getDb();
  const pattern = `%${PLAYER_MATCH_FIXTURE_MARKER}${input.fixtureId}%`;
  const conditions = [
    eq(partnerPlayerMatches.tournamentId, input.tournamentId),
    like(partnerPlayerMatches.round, pattern),
  ];
  if (input.partnerPlayerIds?.length) {
    conditions.push(inArray(partnerPlayerMatches.partnerPlayerId, input.partnerPlayerIds));
  }
  await db.delete(partnerPlayerMatches).where(and(...conditions));
}

/**
 * Sync a completed partner-league fixture into player match history
 * for rostered players on each side (settings.teamRosters).
 */
export async function syncPartnerLeagueMatchResult(input: {
  partnerId: string;
  sportId: string;
  leagueId: string;
  leagueName: string;
  matchId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  playedAt?: Date;
}): Promise<void> {
  const {
    partnerId,
    sportId,
    leagueName,
    matchId,
    teamAName,
    teamBName,
    scoreA,
    scoreB,
    teamAPlayerIds,
    teamBPlayerIds,
    playedAt,
  } = input;

  if (!teamAPlayerIds.length && !teamBPlayerIds.length) return;

  const scoreLabel = `${scoreA}–${scoreB}`;
  const opponents = `${teamAName} vs ${teamBName}`;
  const roundKey = buildPlayerMatchRoundKey(`League · ${leagueName}`, matchId);
  const tournamentName = `League: ${leagueName}`;
  const resolvedPlayedAt = playedAt ?? new Date();

  for (const partnerPlayerId of teamAPlayerIds) {
    await replacePartnerMatchHistoryEntry({
      partnerPlayerId,
      partnerId,
      sportId,
      tournamentId: null,
      tournamentName,
      opponents,
      resultType: resultForSide(scoreA, scoreB, "a"),
      score: scoreLabel,
      round: roundKey,
      playedAt: resolvedPlayedAt,
    });
  }

  for (const partnerPlayerId of teamBPlayerIds) {
    await replacePartnerMatchHistoryEntry({
      partnerPlayerId,
      partnerId,
      sportId,
      tournamentId: null,
      tournamentName,
      opponents,
      resultType: resultForSide(scoreA, scoreB, "b"),
      score: scoreLabel,
      round: roundKey,
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
        id: tournamentBracketMatches.id,
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
        id: tournamentGroupMatches.id,
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
        id: tournamentReclubMatches.id,
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
      fixtureId: row.id,
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
      fixtureId: row.id,
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
      fixtureId: row.id,
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

/** Throttled reconcile for directory polling — refreshes page players from fixtures. */
const reconcileCooldownMs = 20_000;
const lastReconcileByPartner = new Map<string, number>();

export async function reconcilePartnerPlayersStatsThrottled(
  partnerId: string,
  playerIds: string[],
): Promise<void> {
  if (!playerIds.length) return;
  const now = Date.now();
  const last = lastReconcileByPartner.get(partnerId) ?? 0;
  if (now - last < reconcileCooldownMs) return;
  lastReconcileByPartner.set(partnerId, now);

  // Cap work per poll cycle
  const batch = playerIds.slice(0, 12);
  await Promise.allSettled(
    batch.map((playerId) =>
      rebuildPartnerPlayerStatsFromCompletedMatches({ partnerId, playerId }),
    ),
  );
}
