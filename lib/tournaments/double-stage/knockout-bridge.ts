import "server-only";

import { nextPowerOfTwo } from "@/lib/tournaments/double-stage/allocate-groups";
import {
  assignGlobalSeeds,
  optimizePairingsAvoidSameGroup,
  pairPlayInTeams,
  planPlayInAndByes,
  standardBracketPairings,
  type QualifiedTeam,
  type SeededTeam,
} from "@/lib/tournaments/double-stage/seeding";
import { advanceWinnerToNextMatch } from "@/lib/tournaments/brackets/round-one";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import type { TournamentDetail } from "@/lib/tournaments/service";

export async function provisionKnockoutBracket(
  tournament: TournamentDetail,
  seeded: SeededTeam[],
  options?: { thirdPlaceEnabled?: boolean },
): Promise<{ matchCount: number }> {
  const db = getDb();
  const existing = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError("Knockout bracket already exists for this tournament. Reset it first if you need to regenerate.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const plan = planPlayInAndByes(seeded);
  const bracketSize = plan.bracketSize;
  const totalRounds = Math.log2(bracketSize);
  const matchCountPerRound: number[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    matchCountPerRound.push(bracketSize / Math.pow(2, r));
  }

  const allMatchIds: string[][] = [];

  if (plan.playInMatchCount > 0) {
    const playInIds: string[] = [];
    const playInPairs = pairPlayInTeams(plan.playInTeams);
    for (let m = 1; m <= plan.playInMatchCount; m++) {
      const pair = playInPairs[m - 1];
      const [created] = await db
        .insert(tournamentBracketMatches)
        .values({
          tournamentId: tournament.id,
          roundNumber: 0,
          matchNumber: m,
          teamAId: pair?.[0]?.teamId ?? null,
          teamAName: pair?.[0]?.teamName ?? null,
          teamBId: pair?.[1]?.teamId ?? null,
          teamBName: pair?.[1]?.teamName ?? null,
          status: pair ? "pending" : "pending",
          metadata: { phase: "play_in" },
        })
        .returning({ id: tournamentBracketMatches.id });
      if (created) playInIds.push(created.id);
    }
    allMatchIds.push(playInIds);
  }

  for (let round = 1; round <= totalRounds; round++) {
    const count = matchCountPerRound[round - 1]!;
    const roundIds: string[] = [];
    for (let m = 1; m <= count; m++) {
      const [created] = await db
        .insert(tournamentBracketMatches)
        .values({
          tournamentId: tournament.id,
          roundNumber: round,
          matchNumber: m,
          status: "pending",
          metadata: { phase: round === totalRounds ? "final" : "knockout" },
        })
        .returning({ id: tournamentBracketMatches.id });
      if (created) roundIds.push(created.id);
    }
    allMatchIds.push(roundIds);
  }

  const round1Index = plan.playInMatchCount > 0 ? 1 : 0;
  for (let round = round1Index; round < allMatchIds.length - 1; round++) {
    const current = allMatchIds[round]!;
    const next = allMatchIds[round + 1]!;
    for (let i = 0; i < current.length; i++) {
      const nextMatchId = next[Math.floor(i / 2)]!;
      await db
        .update(tournamentBracketMatches)
        .set({ nextMatchId })
        .where(eq(tournamentBracketMatches.id, current[i]!));
    }
  }

  const round1MatchIds = allMatchIds[round1Index] ?? [];
  const slotAssignments = optimizePairingsAvoidSameGroup(seeded, bracketSize);
  for (const bye of plan.byeTeams) {
    slotAssignments.set(bye.globalSeed, bye);
  }
  const pairings = standardBracketPairings(bracketSize);

  const teamsInSlotOrder: { id: string; name: string }[] = [];
  for (const [s1, s2] of pairings) {
    const t1 = slotAssignments.get(s1);
    const t2 = slotAssignments.get(s2);
    teamsInSlotOrder.push(
      t1 ? { id: t1.teamId, name: t1.teamName } : { id: "", name: "BYE" },
      t2 ? { id: t2.teamId, name: t2.teamName } : { id: "", name: "BYE" },
    );
  }

  for (let i = 0; i < round1MatchIds.length; i++) {
    const teamA = teamsInSlotOrder[i * 2];
    const teamB = teamsInSlotOrder[i * 2 + 1];
    const matchId = round1MatchIds[i]!;
    const aValid = teamA?.id;
    const bValid = teamB?.id;

    if (aValid && bValid) {
      await db
        .update(tournamentBracketMatches)
        .set({
          teamAId: teamA.id,
          teamAName: teamA.name,
          teamBId: teamB.id,
          teamBName: teamB.name,
          status: "pending",
        })
        .where(eq(tournamentBracketMatches.id, matchId));
    } else if (aValid && !bValid) {
      await db
        .update(tournamentBracketMatches)
        .set({
          teamAId: teamA.id,
          teamAName: teamA.name,
          teamBId: null,
          teamBName: "BYE",
          winnerTeamId: teamA.id,
          status: "bye",
          completedAt: new Date(),
        })
        .where(eq(tournamentBracketMatches.id, matchId));
      await advanceWinnerToNextMatch(tournament.id, matchId, teamA.id, teamA.name);
    } else if (!aValid && bValid) {
      await db
        .update(tournamentBracketMatches)
        .set({
          teamAId: teamB.id,
          teamAName: teamB.name,
          teamBId: null,
          teamBName: "BYE",
          winnerTeamId: teamB.id,
          status: "bye",
          completedAt: new Date(),
        })
        .where(eq(tournamentBracketMatches.id, matchId));
      await advanceWinnerToNextMatch(tournament.id, matchId, teamB.id, teamB.name);
    }
  }

  if (options?.thirdPlaceEnabled && totalRounds >= 2) {
    await db.insert(tournamentBracketMatches).values({
      tournamentId: tournament.id,
      roundNumber: totalRounds,
      matchNumber: 999,
      status: "pending",
      metadata: { phase: "third_place" },
    });
  }

  if (plan.playInMatchCount > 0 && round1MatchIds.length > 0) {
    const playInIds = allMatchIds[0] ?? [];
    const openR1Slots = round1MatchIds.filter((_, i) => {
      const teamA = teamsInSlotOrder[i * 2];
      const teamB = teamsInSlotOrder[i * 2 + 1];
      return !teamA?.id && !teamB?.id;
    });
    for (let pi = 0; pi < playInIds.length && pi < openR1Slots.length; pi++) {
      const playInId = playInIds[pi]!;
      const r1Id = openR1Slots[pi]!;
      await db
        .update(tournamentBracketMatches)
        .set({ nextMatchId: r1Id })
        .where(eq(tournamentBracketMatches.id, playInId));
    }
  }

  await patchTournamentBracketSettings(tournament, {
    bracketSeedMode: "random",
    bracketSeedingFinalized: true,
  });

  const total = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id));

  return { matchCount: total.length };
}

export function buildQualifiedTeamsFromStandings(
  groups: {
    id: string;
    name: string;
    standings: {
      teamId: string;
      teamName: string;
      rank: number;
      points: number;
      wins: number;
      scoreDiff: number;
      scoreFor: number;
      qualificationStatus: string;
    }[];
  }[],
): QualifiedTeam[] {
  const qualified: QualifiedTeam[] = [];
  for (const g of groups) {
    for (const row of g.standings) {
      if (row.qualificationStatus === "qualified") {
        qualified.push({
          teamId: row.teamId,
          teamName: row.teamName,
          groupId: g.id,
          groupName: g.name,
          groupRank: row.rank,
          points: row.points,
          wins: row.wins,
          scoreDiff: row.scoreDiff,
          scoreFor: row.scoreFor,
        });
      }
    }
  }
  return qualified;
}

export function seedQualifiedTeams(qualified: QualifiedTeam[]): SeededTeam[] {
  return assignGlobalSeeds(qualified);
}

export { nextPowerOfTwo };
