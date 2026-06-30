import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import {
  assertBracketInitialGenerationAllowed,
} from "@/lib/tournaments/lifecycle-guards";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { applyRoundOneSeeding } from "@/lib/tournaments/brackets/round-one";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import type { TournamentDetail } from "@/lib/tournaments/service";

function shuffleTeams<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export async function generateTournamentBracket(
  tournament: TournamentDetail,
  options?: { seedMode?: "random" | "manual" },
): Promise<{ matchCount: number; seedMode: "random" | "manual" }> {
  assertBracketInitialGenerationAllowed(tournament);

  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use brackets", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  const seedMode = options?.seedMode ?? "manual";
  const db = getDb();

  const existing = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id))
    .limit(1);

  if (existing.length) {
    throw new AppError("Bracket already generated. Reset the bracket first to regenerate.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  let teams =
    isFunMatchType(tournament.tournamentType)
      ? (await listLobbyTeamsDetailed(tournament.id))
          .filter((t) => t.memberCount > 0)
          .map((t) => ({ id: t.id, name: t.name }))
      : await db
          .select({
            id: tournamentTeams.id,
            name: tournamentTeams.name,
          })
          .from(tournamentRegistrations)
          .innerJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
          .where(
            and(
              eq(tournamentRegistrations.tournamentId, tournament.id),
              eq(tournamentRegistrations.status, "confirmed"),
            ),
          )
          .orderBy(tournamentTeams.sortOrder);

  if (teams.length < 2) {
    throw new AppError(
      isFunMatchType(tournament.tournamentType)
        ? "Need at least 2 squads with players to generate bracket"
        : "Need at least 2 confirmed teams to generate bracket",
      {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      },
    );
  }

  if (isFunMatchType(tournament.tournamentType)) {
    for (const team of teams) {
      const [reg] = await db
        .select({ id: tournamentRegistrations.id })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, tournament.id),
            eq(tournamentRegistrations.teamId, team.id),
          ),
        )
        .limit(1);
      if (!reg) {
        const [captain] = await db
          .select({ userId: tournamentTeamMembers.userId })
          .from(tournamentTeamMembers)
          .where(
            and(
              eq(tournamentTeamMembers.teamId, team.id),
              eq(tournamentTeamMembers.role, "captain"),
            ),
          )
          .limit(1);
        const registeredBy =
          captain?.userId ??
          (
            await db
              .select({ userId: tournamentTeamMembers.userId })
              .from(tournamentTeamMembers)
              .where(eq(tournamentTeamMembers.teamId, team.id))
              .limit(1)
          )[0]?.userId;
        if (registeredBy) {
          await db.insert(tournamentRegistrations).values({
            tournamentId: tournament.id,
            teamId: team.id,
            registeredByUserId: registeredBy,
            status: "confirmed",
          });
        }
      }
    }
  }

  const bracketSize = nextPowerOfTwo(teams.length);
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
      if (created) roundIds.push(created.id);
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

  const round1 = allMatchIds[0]!;

  if (seedMode === "random") {
    teams = shuffleTeams(teams);
    await applyRoundOneSeeding(tournament.id, round1, teams);
    await patchTournamentBracketSettings(tournament, {
      bracketSeedMode: "random",
      bracketSeedingFinalized: true,
    });
  } else {
    await patchTournamentBracketSettings(tournament, {
      bracketSeedMode: "manual",
      bracketSeedingFinalized: false,
    });
  }

  const totalMatches = allMatchIds.flat().length;
  return { matchCount: totalMatches, seedMode };
}
