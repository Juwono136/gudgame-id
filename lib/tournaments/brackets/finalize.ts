import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import {
  tournamentRegistrations,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { assertBracketSetupAllowed } from "@/lib/tournaments/lifecycle-guards";
import { assertBracketPlayNotStarted } from "@/lib/tournaments/brackets/play-guard";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { hasBracket } from "@/lib/tournaments/brackets/service";
import { processRoundOneByesFromSlots } from "@/lib/tournaments/brackets/round-one";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import type { TournamentDetail } from "@/lib/tournaments/service";

export async function finalizeBracketSeeding(
  tournament: TournamentDetail,
): Promise<{ finalized: true }> {
  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use brackets", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  assertBracketSetupAllowed(tournament);
  await assertBracketPlayNotStarted(tournament.id);

  const bracketExists = await hasBracket(tournament.id);
  if (!bracketExists) {
    throw new AppError("Generate the bracket structure before saving seeding", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();

  const requiredTeams: string[] =
    isFunMatchType(tournament.tournamentType)
      ? (await listLobbyTeamsDetailed(tournament.id))
          .filter((t) => t.memberCount > 0)
          .map((t) => t.id)
      : (
          await db
            .select({ teamId: tournamentRegistrations.teamId })
            .from(tournamentRegistrations)
            .innerJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
            .where(
              and(
                eq(tournamentRegistrations.tournamentId, tournament.id),
                eq(tournamentRegistrations.status, "confirmed"),
              ),
            )
        )
          .map((row) => row.teamId)
          .filter((id): id is string => Boolean(id));

  if (requiredTeams.length < 2) {
    throw new AppError("Need at least 2 teams before finalizing the bracket", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const round1 = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournament.id),
        eq(tournamentBracketMatches.roundNumber, 1),
      ),
    );

  const placedTeamIds = new Set<string>();
  for (const match of round1) {
    if (match.teamAId) {
      if (placedTeamIds.has(match.teamAId)) {
        throw new AppError("A team is placed in more than one bracket slot", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      placedTeamIds.add(match.teamAId);
    }
    if (match.teamBId) {
      if (placedTeamIds.has(match.teamBId)) {
        throw new AppError("A team is placed in more than one bracket slot", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      placedTeamIds.add(match.teamBId);
    }
  }

  const missing = requiredTeams.filter((id) => !placedTeamIds.has(id));
  if (missing.length > 0) {
    throw new AppError(
      `${missing.length} team${missing.length === 1 ? "" : "s"} still need to be placed in round one before saving`,
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }

  await processRoundOneByesFromSlots(tournament.id);
  await patchTournamentBracketSettings(tournament, { bracketSeedingFinalized: true });

  return { finalized: true };
}
