import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";

export async function clearTeamFromBracketSlots(
  tournamentId: number,
  teamId: number,
): Promise<void> {
  const db = getDb();
  const slots = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        inArray(tournamentBracketMatches.status, ["pending", "in_progress"]),
        or(
          eq(tournamentBracketMatches.teamAId, teamId),
          eq(tournamentBracketMatches.teamBId, teamId),
        ),
      ),
    );

  for (const match of slots) {
    const clearA = match.teamAId === teamId;
    const clearB = match.teamBId === teamId;
    if (!clearA && !clearB) continue;

    await db
      .update(tournamentBracketMatches)
      .set(
        clearA && clearB
          ? {
              teamAId: null,
              teamAName: null,
              teamBId: null,
              teamBName: null,
              scoreA: null,
              scoreB: null,
              winnerTeamId: null,
              status: "pending",
            }
          : clearA
            ? { teamAId: null, teamAName: null, scoreA: null, winnerTeamId: null, status: "pending" }
            : { teamBId: null, teamBName: null, scoreB: null, winnerTeamId: null, status: "pending" },
      )
      .where(eq(tournamentBracketMatches.id, match.id));
  }
}
