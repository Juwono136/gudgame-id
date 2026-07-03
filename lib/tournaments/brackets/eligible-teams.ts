import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import { listConfirmedOfficialTeamIds } from "@/lib/tournaments/registration/official-roster";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import type { TournamentDetail } from "@/lib/tournaments/service";

/** Team ids that may be placed in the elimination bracket for this tournament. */
export async function listBracketEligibleTeamIds(tournament: TournamentDetail): Promise<Set<string>> {
  if (isFunMatchType(tournament.tournamentType)) {
    const squads = await listLobbyTeamsDetailed(tournament.id);
    return new Set(squads.filter((t) => t.memberCount > 0).map((t) => t.id));
  }

  return listConfirmedOfficialTeamIds(tournament.id, tournament.officialBilling);
}

export async function assertTeamBracketEligible(
  tournament: TournamentDetail,
  teamId: string,
): Promise<void> {
  const eligible = await listBracketEligibleTeamIds(tournament);
  if (!eligible.has(teamId)) {
    throw new AppError(
      isFunMatchType(tournament.tournamentType)
        ? "This squad is not eligible for bracket seeding yet."
        : "Only confirmed (and paid, if required) teams can be placed in the bracket.",
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }
}

/** Eligible teams with names — used for random bracket seeding. */
export async function listBracketEligibleTeamsForGenerate(
  tournament: TournamentDetail,
): Promise<{ id: string; name: string }[]> {
  const eligibleIds = await listBracketEligibleTeamIds(tournament);
  if (eligibleIds.size === 0) return [];

  if (isFunMatchType(tournament.tournamentType)) {
    return (await listLobbyTeamsDetailed(tournament.id))
      .filter((t) => eligibleIds.has(t.id))
      .map((t) => ({ id: t.id, name: t.name }));
  }

  const db = getDb();
  const rows = await db
    .select({ id: tournamentTeams.id, name: tournamentTeams.name })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournament.id));

  return rows.filter((r) => eligibleIds.has(r.id));
}
