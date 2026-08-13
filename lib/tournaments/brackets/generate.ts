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
import { listBracketEligibleTeamsForGenerate } from "@/lib/tournaments/brackets/eligible-teams";
import { applyRoundOneSeeding } from "@/lib/tournaments/brackets/round-one";
import { clearBracketSeedingForReshuffle } from "@/lib/tournaments/brackets/clear-seeding";
import { ensureBracketStructure } from "@/lib/tournaments/brackets/provision-structure";
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

  if (tournament.format === "americano" || tournament.format === "mexicano") {
    throw new AppError("This tournament format does not use brackets", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  if (tournament.format === "group_only") {
    throw new AppError("Group-only tournaments do not have a knockout bracket.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  if (tournament.format === "double_stage") {
    throw new AppError(
      "Double stage knockout is generated automatically when the group stage finishes (or via Groups → Generate knockout). Do not use the generic bracket generate for this format.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  const seedMode = options?.seedMode ?? "manual";
  const db = getDb();

  await ensureBracketStructure(tournament);

  const existingRound1 = await db
    .select({
      id: tournamentBracketMatches.id,
      teamAId: tournamentBracketMatches.teamAId,
      teamBId: tournamentBracketMatches.teamBId,
      metadata: tournamentBracketMatches.metadata,
    })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournament.id),
        eq(tournamentBracketMatches.roundNumber, 1),
      ),
    )
    .orderBy(tournamentBracketMatches.matchNumber)
    .then((rows) =>
      rows.filter((row) => {
        const meta = row.metadata as Record<string, unknown> | null;
        return !meta || typeof meta.seriesParentId !== "string";
      }),
    );

  const structureExists = existingRound1.length > 0;
  const round1HasTeams = existingRound1.some((m) => m.teamAId || m.teamBId);

  if (structureExists && round1HasTeams && seedMode === "manual") {
    const total = await db
      .select({ id: tournamentBracketMatches.id })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    return { matchCount: total.length, seedMode: (tournament.settings?.bracketSeedMode ?? "manual") as "random" | "manual" };
  }

  if (structureExists && round1HasTeams && seedMode === "random") {
    const teams = await listBracketEligibleTeamsForGenerate(tournament);
    if (teams.length < 2) {
      throw new AppError(
        isFunMatchType(tournament.tournamentType)
          ? "Need at least 2 squads with players to random seed"
          : "Need at least 2 confirmed teams to random seed",
        { code: "VALIDATION_ERROR", statusCode: 422 },
      );
    }

    const round1Ids = await clearBracketSeedingForReshuffle(tournament.id);
    const shuffled = shuffleTeams(teams);
    await applyRoundOneSeeding(tournament.id, round1Ids, shuffled);
    const total = await db
      .select({ id: tournamentBracketMatches.id })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    await patchTournamentBracketSettings(tournament, {
      bracketSeedMode: "random",
      bracketSeedingFinalized: true,
    });
    return { matchCount: total.length, seedMode: "random" };
  }

  if (structureExists && !round1HasTeams && seedMode === "manual") {
    const total = await db
      .select({ id: tournamentBracketMatches.id })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    await patchTournamentBracketSettings(tournament, {
      bracketSeedMode: "manual",
      bracketSeedingFinalized: false,
    });
    return { matchCount: total.length, seedMode: "manual" };
  }

  const teams = await listBracketEligibleTeamsForGenerate(tournament);

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

  if (structureExists) {
    const round1Ids = existingRound1.map((m) => m.id);
    const total = await db
      .select({ id: tournamentBracketMatches.id })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    if (seedMode === "random") {
      const shuffled = shuffleTeams(teams);
      await applyRoundOneSeeding(tournament.id, round1Ids, shuffled);
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
    return { matchCount: total.length, seedMode };
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

  const round1Ids = allMatchIds[0]!;

  if (seedMode === "random") {
    const shuffled = shuffleTeams(teams);
    await applyRoundOneSeeding(tournament.id, round1Ids, shuffled);
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
