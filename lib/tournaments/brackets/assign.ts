import "server-only";

import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { assertBracketSetupAllowed } from "@/lib/tournaments/lifecycle-guards";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import { assertReclubSessionPlayable } from "@/lib/tournaments/reclub/session-guard";
import { assertTeamBracketEligible } from "@/lib/tournaments/brackets/eligible-teams";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { listBracketMatches, type BracketMatchView } from "@/lib/tournaments/brackets/service";
import { isBracketSeriesChildLeg } from "@/lib/tournaments/brackets/bracket-metadata";
import { syncSeriesTeams } from "@/lib/tournaments/brackets/series-legs";
import { isBracketSeedingLocked } from "@/lib/tournaments/brackets/seeding-state";

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

  if (tournament.format === "double_stage") {
    return assignDoubleStageKnockoutSlot(tournament, matchId, slot, teamId);
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
      const [other] = await db
        .select()
        .from(tournamentBracketMatches)
        .where(eq(tournamentBracketMatches.id, duplicate.id))
        .limit(1);
      if (!other || other.status !== "pending") {
        throw new AppError("This squad is already placed in a match that cannot be edited", {
          code: "CONFLICT",
          statusCode: 409,
        });
      }
      const otherSlot: "a" | "b" = other.teamAId === teamId ? "a" : "b";
      const incoming =
        slot === "a"
          ? { teamId: match.teamAId, teamName: match.teamAName }
          : { teamId: match.teamBId, teamName: match.teamBName };
      const otherPatch =
        otherSlot === "a"
          ? { teamAId: incoming.teamId, teamAName: incoming.teamName }
          : { teamBId: incoming.teamId, teamBName: incoming.teamName };
      await db
        .update(tournamentBracketMatches)
        .set(otherPatch)
        .where(eq(tournamentBracketMatches.id, other.id));
      await syncSeriesTeams(tournament.id, other.id, otherPatch);
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

function isKnockoutEntryParent(row: {
  roundNumber: number;
  matchNumber: number;
  metadata: unknown;
}): boolean {
  if (row.matchNumber === 999) return false;
  if (row.roundNumber !== 0 && row.roundNumber !== 1) return false;
  return !isBracketSeriesChildLeg(row.metadata);
}

/**
 * Double-stage: only swap teams that are already in the knockout (qualified).
 * Locked once any knockout match is scored, live, or a walkover.
 */
async function assignDoubleStageKnockoutSlot(
  tournament: TournamentDetail,
  matchId: string,
  slot: "a" | "b",
  teamId: string | null,
): Promise<BracketMatchView> {
  if (!teamId) {
    throw new AppError(
      "Knockout slots cannot be cleared. Swap with another qualified team, or reset the bracket from Groups.",
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }

  assertBracketSetupAllowed(tournament);

  const db = getDb();
  const rows = await db
    .select()
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id));

  if (
    isBracketSeedingLocked(
      rows.map((r) => ({ status: r.status })),
      tournament.status,
      { format: "double_stage" },
    )
  ) {
    throw new AppError(
      "Knockout pairings cannot be changed after a match has started, finished, or walked over.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  const target = rows.find((r) => r.id === matchId);
  if (!target) {
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (!isKnockoutEntryParent(target)) {
    throw new AppError("Only first-round knockout slots can be swapped.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  if (target.status !== "pending") {
    throw new AppError("This match has already started or finished", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [team] = await db
    .select({ id: tournamentTeams.id, name: tournamentTeams.name })
    .from(tournamentTeams)
    .where(
      and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, tournament.id)),
    )
    .limit(1);
  if (!team) {
    throw new AppError("Squad not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const parents = rows.filter(isKnockoutEntryParent);
  type Occ = {
    matchId: string;
    slot: "a" | "b";
    teamId: string;
    teamName: string | null;
  };
  const occupancies: Occ[] = [];
  for (const row of parents) {
    if (row.teamAId) {
      occupancies.push({
        matchId: row.id,
        slot: "a",
        teamId: row.teamAId,
        teamName: row.teamAName,
      });
    }
    if (row.teamBId) {
      occupancies.push({
        matchId: row.id,
        slot: "b",
        teamId: row.teamBId,
        teamName: row.teamBName,
      });
    }
  }

  const selectedOcc = occupancies.find((o) => o.teamId === teamId);
  if (!selectedOcc) {
    throw new AppError(
      "Only teams already in this knockout can be swapped. Reset the bracket from Groups to regenerate from qualified standings.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  if (selectedOcc.matchId === matchId && selectedOcc.slot === slot) {
    const updatedMatches = await listBracketMatches(tournament.id);
    const hydrated = updatedMatches.find((item) => item.id === matchId);
    if (!hydrated) {
      throw new AppError("Could not reload bracket slot", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
    return hydrated;
  }

  const targetOcc = occupancies.find((o) => o.matchId === matchId && o.slot === slot);
  const targetPatch =
    slot === "a"
      ? { teamAId: team.id, teamAName: team.name }
      : { teamBId: team.id, teamBName: team.name };

  await db
    .update(tournamentBracketMatches)
    .set(targetPatch)
    .where(eq(tournamentBracketMatches.id, matchId));
  await syncSeriesTeams(tournament.id, matchId, targetPatch);

  if (selectedOcc.matchId !== matchId || selectedOcc.slot !== slot) {
    const incoming = targetOcc
      ? { teamId: targetOcc.teamId, teamName: targetOcc.teamName }
      : { teamId: null as string | null, teamName: null as string | null };
    const sourcePatch =
      selectedOcc.slot === "a"
        ? { teamAId: incoming.teamId, teamAName: incoming.teamName }
        : { teamBId: incoming.teamId, teamBName: incoming.teamName };
    await db
      .update(tournamentBracketMatches)
      .set(sourcePatch)
      .where(eq(tournamentBracketMatches.id, selectedOcc.matchId));
    await syncSeriesTeams(tournament.id, selectedOcc.matchId, sourcePatch);
  }

  const updatedMatches = await listBracketMatches(tournament.id);
  const hydrated = updatedMatches.find((item) => item.id === matchId);
  if (!hydrated) {
    throw new AppError("Could not reload bracket slot", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }
  return hydrated;
}
