import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { getKnockoutLegsPerSlot } from "@/lib/tournaments/format-capabilities";
import { resolveSeriesMajority } from "@/lib/tournaments/scoring/match-scoring";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  parseBracketMatchMetadata,
  type BracketMatchMetadata,
} from "@/lib/tournaments/brackets/bracket-metadata";

export type SeriesLegMeta = {
  seriesParentId?: string;
  legIndex?: number;
  legsRequired?: number;
  isSeriesSlot?: boolean;
};

export function readSeriesMeta(raw: unknown): SeriesLegMeta {
  const meta = parseBracketMatchMetadata(raw);
  return {
    seriesParentId: meta.seriesParentId,
    legIndex: meta.legIndex,
    legsRequired: meta.legsRequired,
    isSeriesSlot: meta.isSeriesSlot,
  };
}

export function seriesParentIdOf(match: {
  id: string;
  metadata: unknown;
}): string {
  const meta = readSeriesMeta(match.metadata);
  return meta.seriesParentId ?? match.id;
}

/**
 * After inserting a slot parent row, create remaining legs (2..N) linked via metadata.
 * Parent keeps nextMatchId and is the series slot (leg 1).
 */
export async function expandSlotWithSeriesLegs(input: {
  tournamentId: string;
  parentId: string;
  roundNumber: number;
  matchNumber: number;
  legsRequired: number;
  teamAId?: string | null;
  teamAName?: string | null;
  teamBId?: string | null;
  teamBName?: string | null;
  baseMetadata?: Record<string, unknown>;
}): Promise<void> {
  const legs = Math.max(1, Math.floor(input.legsRequired) || 1);
  const db = getDb();
  const base = input.baseMetadata ?? {};

  await db
    .update(tournamentBracketMatches)
    .set({
      metadata: {
        ...base,
        isSeriesSlot: true,
        legIndex: 1,
        legsRequired: legs,
      } satisfies BracketMatchMetadata & Record<string, unknown>,
    })
    .where(eq(tournamentBracketMatches.id, input.parentId));

  if (legs <= 1) return;

  for (let leg = 2; leg <= legs; leg++) {
    await db.insert(tournamentBracketMatches).values({
      tournamentId: input.tournamentId,
      roundNumber: input.roundNumber,
      matchNumber: input.matchNumber,
      teamAId: input.teamAId ?? null,
      teamAName: input.teamAName ?? null,
      teamBId: input.teamBId ?? null,
      teamBName: input.teamBName ?? null,
      status: "pending",
      metadata: {
        ...base,
        seriesParentId: input.parentId,
        legIndex: leg,
        legsRequired: legs,
      },
    });
  }
}

export async function listSeriesLegMatches(
  tournamentId: string,
  parentId: string,
): Promise<(typeof tournamentBracketMatches.$inferSelect)[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId));

  return rows.filter((row) => {
    if (row.id === parentId) return true;
    const meta = readSeriesMeta(row.metadata);
    return meta.seriesParentId === parentId;
  });
}

/** Copy team assignment onto every leg in the series (parent + children). */
export async function syncSeriesTeams(
  tournamentId: string,
  parentId: string,
  teams: {
    teamAId?: string | null;
    teamAName?: string | null;
    teamBId?: string | null;
    teamBName?: string | null;
  },
): Promise<void> {
  const legs = await listSeriesLegMatches(tournamentId, parentId);
  const db = getDb();
  for (const leg of legs) {
    await db
      .update(tournamentBracketMatches)
      .set({
        ...(teams.teamAId !== undefined
          ? { teamAId: teams.teamAId, teamAName: teams.teamAName ?? null }
          : {}),
        ...(teams.teamBId !== undefined
          ? { teamBId: teams.teamBId, teamBName: teams.teamBName ?? null }
          : {}),
      })
      .where(eq(tournamentBracketMatches.id, leg.id));
  }
}

export async function resolveSeriesAfterLegComplete(input: {
  tournament: TournamentDetail;
  completedLeg: typeof tournamentBracketMatches.$inferSelect;
}): Promise<{
  seriesComplete: boolean;
  seriesWinnerTeamId: string | null;
  parent: typeof tournamentBracketMatches.$inferSelect;
}> {
  const parentId = seriesParentIdOf(input.completedLeg);
  const db = getDb();
  const [parent] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, parentId),
        eq(tournamentBracketMatches.tournamentId, input.tournament.id),
      ),
    )
    .limit(1);

  if (!parent) {
    return {
      seriesComplete: true,
      seriesWinnerTeamId: input.completedLeg.winnerTeamId,
      parent: input.completedLeg,
    };
  }

  const legsRequired =
    readSeriesMeta(parent.metadata).legsRequired ??
    getKnockoutLegsPerSlot(input.tournament);

  if (legsRequired <= 1) {
    return {
      seriesComplete: true,
      seriesWinnerTeamId: input.completedLeg.winnerTeamId,
      parent,
    };
  }

  const legs = await listSeriesLegMatches(input.tournament.id, parentId);
  const results = legs.map((leg) => {
    if (leg.status !== "completed" || !leg.winnerTeamId) return null;
    if (leg.winnerTeamId === leg.teamAId) return "a" as const;
    if (leg.winnerTeamId === leg.teamBId) return "b" as const;
    return null;
  });

  const majority = resolveSeriesMajority(results);
  if (majority.status !== "complete" || !majority.winner) {
    return { seriesComplete: false, seriesWinnerTeamId: null, parent };
  }

  const seriesWinnerTeamId =
    majority.winner === "a" ? parent.teamAId : parent.teamBId;

  if (seriesWinnerTeamId && parent.status !== "completed") {
    await db
      .update(tournamentBracketMatches)
      .set({
        winnerTeamId: seriesWinnerTeamId,
        status: "completed",
        completedAt: new Date(),
        scoreA: majority.winsA,
        scoreB: majority.winsB,
      })
      .where(eq(tournamentBracketMatches.id, parent.id));
  }

  return {
    seriesComplete: true,
    seriesWinnerTeamId: seriesWinnerTeamId ?? null,
    parent,
  };
}

export function tournamentKnockoutLegs(tournament: TournamentDetail): number {
  return getKnockoutLegsPerSlot(tournament);
}
