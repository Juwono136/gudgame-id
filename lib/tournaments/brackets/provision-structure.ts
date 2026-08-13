import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import type { TournamentDetail } from "@/lib/tournaments/service";

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Ensures an empty elimination bracket tree exists for the tournament capacity.
 * Safe to call multiple times — no-op when rows already exist.
 */
export async function ensureBracketStructure(tournament: TournamentDetail): Promise<boolean> {
  if (
    tournament.format === "americano" ||
    tournament.format === "mexicano" ||
    tournament.format === "double_stage" ||
    tournament.format === "group_only"
  ) {
    return false;
  }

  const db = getDb();
  const existing = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id))
    .limit(1);

  if (existing.length > 0) return true;

  const { expandSlotWithSeriesLegs, tournamentKnockoutLegs } = await import(
    "@/lib/tournaments/brackets/series-legs"
  );
  const legs = tournamentKnockoutLegs(tournament);

  const capacity = Math.max(2, tournament.maxTeams ?? 8);
  const bracketSize = nextPowerOfTwo(capacity);
  const totalRounds = Math.log2(bracketSize);
  const matchCountPerRound: number[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    matchCountPerRound.push(bracketSize / Math.pow(2, r));
  }

  const allMatchIds: string[][] = [];

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
        });
      }
    }
    allMatchIds.push(roundIds);
  }

  for (let round = 1; round < totalRounds; round++) {
    const current = allMatchIds[round - 1]!;
    const next = allMatchIds[round]!;
    for (let i = 0; i < current.length; i++) {
      const nextMatchId = next[Math.floor(i / 2)]!;
      await db
        .update(tournamentBracketMatches)
        .set({ nextMatchId })
        .where(eq(tournamentBracketMatches.id, current[i]!));
    }
  }

  await patchTournamentBracketSettings(tournament, {
    bracketSeedMode: "manual",
    bracketSeedingFinalized: false,
  });

  return true;
}
