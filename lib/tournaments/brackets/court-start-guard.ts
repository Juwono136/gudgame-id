import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { getActiveReclubMatches } from "@/lib/tournaments/reclub/matches";
import { assertTeamsAvailableForCourt } from "@/lib/tournaments/reclub/active-court-lock-server";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

/** Block starting a bracket match when squads or players are already live on another court. */
export async function assertSquadsAvailableForBracketCourt(
  tournamentId: string,
  teamAId: string,
  teamBId: string,
  courtId: string,
): Promise<void> {
  const db = getDb();
  const [reclubActive, bracketActive] = await Promise.all([
    getActiveReclubMatches(tournamentId),
    db
      .select({
        teamAId: tournamentBracketMatches.teamAId,
        teamBId: tournamentBracketMatches.teamBId,
        courtId: tournamentBracketMatches.courtId,
      })
      .from(tournamentBracketMatches)
      .where(
        and(
          eq(tournamentBracketMatches.tournamentId, tournamentId),
          eq(tournamentBracketMatches.status, "in_progress"),
        ),
      ),
  ]);

  const activeOnOtherCourts: Pick<ReclubMatchView, "teamAId" | "teamBId" | "courtId">[] = [
    ...reclubActive,
    ...bracketActive.map((m) => ({
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      courtId: m.courtId,
    })),
  ];

  await assertTeamsAvailableForCourt(
    activeOnOtherCourts as ReclubMatchView[],
    teamAId,
    teamBId,
    courtId,
  );
}
