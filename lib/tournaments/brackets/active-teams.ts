import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";

export async function getTeamsInActiveBracketMatches(
  tournamentId: string,
): Promise<string[]> {
  const rows = await getDb()
    .select({
      teamAId: tournamentBracketMatches.teamAId,
      teamBId: tournamentBracketMatches.teamBId,
    })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        eq(tournamentBracketMatches.status, "in_progress"),
      ),
    );

  const teamIds = new Set<string>();
  for (const row of rows) {
    if (row.teamAId) teamIds.add(row.teamAId);
    if (row.teamBId) teamIds.add(row.teamBId);
  }
  return [...teamIds];
}

export async function hasActiveBracketMatch(tournamentId: string): Promise<boolean> {
  const teams = await getTeamsInActiveBracketMatches(tournamentId);
  return teams.length > 0;
}

export async function assertTeamsNotInActiveBracket(
  tournamentId: string,
  teamAId: string,
  teamBId: string,
): Promise<void> {
  const busy = await getTeamsInActiveBracketMatches(tournamentId);
  const busySet = new Set(busy);

  if (busySet.has(teamAId) || busySet.has(teamBId)) {
    throw new AppError(
      "One or both squads are in an active bracket match — finish that match before starting a lobby round",
      { code: "CONFLICT", statusCode: 409 },
    );
  }
}
