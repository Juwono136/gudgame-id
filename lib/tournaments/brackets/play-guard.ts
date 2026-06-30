import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";

export async function assertBracketPlayNotStarted(tournamentId: string): Promise<void> {
  const [started] = await getDb()
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        inArray(tournamentBracketMatches.status, ["in_progress", "completed"]),
      ),
    )
    .limit(1);

  if (started) {
    throw new AppError(
      "Bracket seeding is locked once matches have been scored or are in progress.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }
}
