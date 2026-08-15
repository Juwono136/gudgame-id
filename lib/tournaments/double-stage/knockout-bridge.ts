import "server-only";

import { asc, eq } from "drizzle-orm";
import { nextPowerOfTwo } from "@/lib/tournaments/double-stage/allocate-groups";
import {
  assignGlobalSeeds,
  buildCrossGroupRoundOneSlotOrder,
  pairPlayInTeams,
  planPlayInAndByes,
  type QualifiedTeam,
  type SeededTeam,
} from "@/lib/tournaments/double-stage/seeding";
import { advanceWinnerToNextMatch } from "@/lib/tournaments/brackets/round-one";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  expandSlotWithSeriesLegs,
  syncSeriesTeams,
  tournamentKnockoutLegs,
} from "@/lib/tournaments/brackets/series-legs";
import {
  isBracketSeriesChildLeg,
} from "@/lib/tournaments/brackets/bracket-metadata";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import { knockoutBracketEntryNeedsSeeding } from "@/lib/tournaments/double-stage/knockout-seeding-state";

export { knockoutBracketEntryNeedsSeeding } from "@/lib/tournaments/double-stage/knockout-seeding-state";

export { buildQualifiedTeamsFromStandings } from "@/lib/tournaments/double-stage/qualification";
export type { BuildQualifiedOptions } from "@/lib/tournaments/double-stage/qualification";

type BracketSlotRow = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  status: string;
  metadata: unknown;
};

function isKnockoutSlotParent(row: BracketSlotRow): boolean {
  return !isBracketSeriesChildLeg(row.metadata);
}

function orderedSlotParents(
  rows: BracketSlotRow[],
  roundNumber: number,
): BracketSlotRow[] {
  return rows
    .filter((r) => r.roundNumber === roundNumber && isKnockoutSlotParent(r))
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

async function applyKnockoutRoundOneSeeding(
  tournament: TournamentDetail,
  round1MatchIds: string[],
  seeded: SeededTeam[],
  plan: ReturnType<typeof planPlayInAndByes>,
): Promise<void> {
  const db = getDb();
  const bracketSize = plan.bracketSize;
  const slotOrder = buildCrossGroupRoundOneSlotOrder(plan.byeTeams, bracketSize);

  const teamsInSlotOrder: { id: string; name: string }[] = slotOrder.map((t) =>
    t ? { id: t.teamId, name: t.teamName } : { id: "", name: "" },
  );

  const playInFeederMatchIds = new Set<string>();
  if (plan.playInMatchCount > 0) {
    const halfFilled: string[] = [];
    const fullyEmpty: string[] = [];
    for (let i = 0; i < round1MatchIds.length; i++) {
      const teamA = teamsInSlotOrder[i * 2];
      const teamB = teamsInSlotOrder[i * 2 + 1];
      const filled = Number(Boolean(teamA?.id)) + Number(Boolean(teamB?.id));
      const matchId = round1MatchIds[i]!;
      if (filled === 1) halfFilled.push(matchId);
      else if (filled === 0) fullyEmpty.push(matchId);
    }
    for (const id of [...halfFilled, ...fullyEmpty].slice(0, plan.playInMatchCount)) {
      playInFeederMatchIds.add(id);
    }
  }

  for (let i = 0; i < round1MatchIds.length; i++) {
    const teamA = teamsInSlotOrder[i * 2];
    const teamB = teamsInSlotOrder[i * 2 + 1];
    const matchId = round1MatchIds[i]!;
    const aValid = teamA?.id;
    const bValid = teamB?.id;
    const awaitsPlayIn = playInFeederMatchIds.has(matchId);

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
      await syncSeriesTeams(tournament.id, matchId, {
        teamAId: teamA.id,
        teamAName: teamA.name,
        teamBId: teamB.id,
        teamBName: teamB.name,
      });
    } else if (aValid && !bValid) {
      if (awaitsPlayIn) {
        await db
          .update(tournamentBracketMatches)
          .set({
            teamAId: teamA.id,
            teamAName: teamA.name,
            teamBId: null,
            teamBName: null,
            status: "pending",
          })
          .where(eq(tournamentBracketMatches.id, matchId));
        await syncSeriesTeams(tournament.id, matchId, {
          teamAId: teamA.id,
          teamAName: teamA.name,
          teamBId: null,
          teamBName: null,
        });
      } else {
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
        await syncSeriesTeams(tournament.id, matchId, {
          teamAId: teamA.id,
          teamAName: teamA.name,
          teamBId: null,
          teamBName: "BYE",
        });
        await advanceWinnerToNextMatch(tournament.id, matchId, teamA.id, teamA.name);
      }
    } else if (!aValid && bValid) {
      if (awaitsPlayIn) {
        await db
          .update(tournamentBracketMatches)
          .set({
            teamAId: null,
            teamAName: null,
            teamBId: teamB.id,
            teamBName: teamB.name,
            status: "pending",
          })
          .where(eq(tournamentBracketMatches.id, matchId));
        await syncSeriesTeams(tournament.id, matchId, {
          teamAId: null,
          teamAName: null,
          teamBId: teamB.id,
          teamBName: teamB.name,
        });
      } else {
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
        await syncSeriesTeams(tournament.id, matchId, {
          teamAId: teamB.id,
          teamAName: teamB.name,
          teamBId: null,
          teamBName: "BYE",
        });
        await advanceWinnerToNextMatch(tournament.id, matchId, teamB.id, teamB.name);
      }
    }
  }
}

async function seedPlayInSlotsIfEmpty(
  tournament: TournamentDetail,
  playInRows: BracketSlotRow[],
  playInTeams: SeededTeam[],
): Promise<void> {
  if (playInRows.length === 0 || playInTeams.length === 0) return;
  const needsPlayInSeed = playInRows.every((r) => !r.teamAId && !r.teamBId);
  if (!needsPlayInSeed) return;

  const db = getDb();
  const pairs = pairPlayInTeams(playInTeams);
  for (let m = 0; m < playInRows.length; m++) {
    const pair = pairs[m];
    const row = playInRows[m]!;
    if (!pair?.[0] || !pair?.[1]) continue;
    await db
      .update(tournamentBracketMatches)
      .set({
        teamAId: pair[0].teamId,
        teamAName: pair[0].teamName,
        teamBId: pair[1].teamId,
        teamBName: pair[1].teamName,
        status: "pending",
      })
      .where(eq(tournamentBracketMatches.id, row.id));
    await syncSeriesTeams(tournament.id, row.id, {
      teamAId: pair[0].teamId,
      teamAName: pair[0].teamName,
      teamBId: pair[1].teamId,
      teamBName: pair[1].teamName,
    });
  }
}

/**
 * Populate qualified teams into an existing empty knockout tree (partial write /
 * idempotent advance race). No-op when entry slots already have teams or play started.
 */
export async function seedExistingKnockoutBracket(
  tournament: TournamentDetail,
  seeded: SeededTeam[],
): Promise<{ applied: boolean; reason?: string }> {
  const db = getDb();
  const rows = await db
    .select({
      id: tournamentBracketMatches.id,
      roundNumber: tournamentBracketMatches.roundNumber,
      matchNumber: tournamentBracketMatches.matchNumber,
      teamAId: tournamentBracketMatches.teamAId,
      teamBId: tournamentBracketMatches.teamBId,
      status: tournamentBracketMatches.status,
      metadata: tournamentBracketMatches.metadata,
    })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id))
    .orderBy(
      asc(tournamentBracketMatches.roundNumber),
      asc(tournamentBracketMatches.matchNumber),
    );

  if (rows.length === 0) {
    return { applied: false, reason: "no_bracket" };
  }

  if (!knockoutBracketEntryNeedsSeeding(rows)) {
    return { applied: false, reason: "already_seeded" };
  }

  const scored = rows.some(
    (r) =>
      isKnockoutSlotParent(r) &&
      (r.status === "in_progress" ||
        r.status === "completed" ||
        r.status === "bye"),
  );
  if (scored) {
    return { applied: false, reason: "play_started" };
  }

  const plan = planPlayInAndByes(seeded);
  const playInRows = orderedSlotParents(rows, 0);
  const round1Rows = orderedSlotParents(rows, 1);

  await seedPlayInSlotsIfEmpty(tournament, playInRows, plan.playInTeams);

  if (round1Rows.length === 0) {
    return { applied: false, reason: "no_round_one" };
  }

  await applyKnockoutRoundOneSeeding(
    tournament,
    round1Rows.map((r) => r.id),
    seeded,
    plan,
  );

  await patchTournamentBracketSettings(tournament, {
    bracketSeedMode: "random",
    bracketSeedingFinalized: true,
  });
  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  return { applied: true };
}

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
    const repaired = await seedExistingKnockoutBracket(tournament, seeded);
    if (repaired.applied) {
      const total = await db
        .select({ id: tournamentBracketMatches.id })
        .from(tournamentBracketMatches)
        .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
      return { matchCount: total.length };
    }
    throw new AppError(
      "Knockout bracket already exists for this tournament. Reset it first if you need to regenerate.",
      {
        code: "CONFLICT",
        statusCode: 409,
      },
    );
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
    const legs = tournamentKnockoutLegs(tournament);
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
          status: "pending",
          metadata: { phase: "play_in" },
        })
        .returning({ id: tournamentBracketMatches.id });
      if (created) {
        playInIds.push(created.id);
        await expandSlotWithSeriesLegs({
          tournamentId: tournament.id,
          parentId: created.id,
          roundNumber: 0,
          matchNumber: m,
          legsRequired: legs,
          teamAId: pair?.[0]?.teamId ?? null,
          teamAName: pair?.[0]?.teamName ?? null,
          teamBId: pair?.[1]?.teamId ?? null,
          teamBName: pair?.[1]?.teamName ?? null,
          baseMetadata: { phase: "play_in" },
        });
      }
    }
    allMatchIds.push(playInIds);
  }

  const legs = tournamentKnockoutLegs(tournament);
  for (let round = 1; round <= totalRounds; round++) {
    const count = matchCountPerRound[round - 1]!;
    const roundIds: string[] = [];
    for (let m = 1; m <= count; m++) {
      const phase = round === totalRounds ? "final" : "knockout";
      const [created] = await db
        .insert(tournamentBracketMatches)
        .values({
          tournamentId: tournament.id,
          roundNumber: round,
          matchNumber: m,
          status: "pending",
          metadata: { phase },
        })
        .returning({ id: tournamentBracketMatches.id });
      if (created) {
        roundIds.push(created.id);
        await expandSlotWithSeriesLegs({
          tournamentId: tournament.id,
          parentId: created.id,
          roundNumber: round,
          matchNumber: m,
          legsRequired: legs,
          baseMetadata: { phase },
        });
      }
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
  await applyKnockoutRoundOneSeeding(tournament, round1MatchIds, seeded, plan);

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
    const planForFeeders = planPlayInAndByes(seeded);
    const slotOrder = buildCrossGroupRoundOneSlotOrder(
      planForFeeders.byeTeams,
      planForFeeders.bracketSize,
    );
    const teamsInSlotOrder: { id: string; name: string }[] = slotOrder.map((t) =>
      t ? { id: t.teamId, name: t.teamName } : { id: "", name: "" },
    );
    const playInFeederMatchIds = new Set<string>();
    const halfFilled: string[] = [];
    const fullyEmpty: string[] = [];
    for (let i = 0; i < round1MatchIds.length; i++) {
      const teamA = teamsInSlotOrder[i * 2];
      const teamB = teamsInSlotOrder[i * 2 + 1];
      const filled = Number(Boolean(teamA?.id)) + Number(Boolean(teamB?.id));
      const matchId = round1MatchIds[i]!;
      if (filled === 1) halfFilled.push(matchId);
      else if (filled === 0) fullyEmpty.push(matchId);
    }
    for (const id of [...halfFilled, ...fullyEmpty].slice(0, plan.playInMatchCount)) {
      playInFeederMatchIds.add(id);
    }
    const feederOrder = [...playInFeederMatchIds];
    for (let pi = 0; pi < playInIds.length && pi < feederOrder.length; pi++) {
      const playInId = playInIds[pi]!;
      const r1Id = feederOrder[pi]!;
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

export function seedQualifiedTeams(qualified: QualifiedTeam[]): SeededTeam[] {
  return assignGlobalSeeds(qualified);
}

export { nextPowerOfTwo };
