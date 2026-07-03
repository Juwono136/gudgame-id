import "server-only";

import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { assertBracketSetupAllowed } from "@/lib/tournaments/lifecycle-guards";
import { assertBracketPlayNotStarted } from "@/lib/tournaments/brackets/play-guard";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import { assertReclubSessionPlayable } from "@/lib/tournaments/reclub/session-guard";
import { assertTeamBracketEligible } from "@/lib/tournaments/brackets/eligible-teams";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { listBracketMatches, type BracketMatchView } from "@/lib/tournaments/brackets/service";

export async function assignTeamToBracketSlot(
  tournament: TournamentDetail,
  matchId: string,
  slot: "a" | "b",
  teamId: string | null,
): Promise<BracketMatchView> {
  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use brackets", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  if (isFunMatchType(tournament.tournamentType)) {
    assertReclubSessionPlayable(tournament);
  }

  const db = getDb();

  const [match] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, matchId),
        eq(tournamentBracketMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);

  if (!match) {
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (match.roundNumber !== 1) {
    throw new AppError("Seeding is only allowed in the first round", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  assertBracketSetupAllowed(tournament);
  await assertBracketPlayNotStarted(tournament.id);

  if (match.status !== "pending") {
    throw new AppError("This match has already started or finished", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (teamId != null) {
    const [team] = await db
      .select()
      .from(tournamentTeams)
      .where(
        and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, tournament.id)),
      )
      .limit(1);

    if (!team) {
      throw new AppError("Squad not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const [member] = await db
      .select({ userId: tournamentTeamMembers.userId })
      .from(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.teamId, teamId))
      .limit(1);

    if (!member) {
      throw new AppError("Squad must have at least one player", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await assertTeamBracketEligible(tournament, teamId);

    const [duplicate] = await db
      .select({ id: tournamentBracketMatches.id })
      .from(tournamentBracketMatches)
      .where(
        and(
          eq(tournamentBracketMatches.tournamentId, tournament.id),
          eq(tournamentBracketMatches.roundNumber, 1),
          or(
            eq(tournamentBracketMatches.teamAId, teamId),
            eq(tournamentBracketMatches.teamBId, teamId),
          ),
        ),
      )
      .limit(1);

    if (duplicate && duplicate.id !== matchId) {
      throw new AppError("This squad is already placed in the bracket", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
  }

  let teamName: string | null = null;
  if (teamId != null) {
    const [teamRow] = await db
      .select({ name: tournamentTeams.name })
      .from(tournamentTeams)
      .where(eq(tournamentTeams.id, teamId))
      .limit(1);
    teamName = teamRow?.name ?? null;
  }

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set(
      teamId == null
        ? slot === "a"
          ? { teamAId: null, teamAName: null }
          : { teamBId: null, teamBName: null }
        : slot === "a"
          ? { teamAId: teamId, teamAName: teamName }
          : { teamBId: teamId, teamBName: teamName },
    )
    .where(eq(tournamentBracketMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update bracket slot", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const updatedMatches = await listBracketMatches(tournament.id);
  const hydrated = updatedMatches.find((item) => item.id === updated.id);
  if (!hydrated) {
    throw new AppError("Could not reload bracket slot", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  await patchTournamentBracketSettings(tournament, { bracketSeedingFinalized: false });

  return hydrated;
}
