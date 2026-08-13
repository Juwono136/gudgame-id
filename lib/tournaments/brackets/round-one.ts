import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";

type SeedTeam = { id: string; name: string };

export async function advanceWinnerToNextMatch(
  tournamentId: string,
  matchId: string,
  winnerTeamId: string,
  winnerName: string,
): Promise<void> {
  const db = getDb();
  const [match] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, matchId),
        eq(tournamentBracketMatches.tournamentId, tournamentId),
      ),
    )
    .limit(1);

  if (!match?.nextMatchId) return;

  const [next] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.id, match.nextMatchId))
    .limit(1);

  if (!next) return;

  const slotA = next.teamAId == null;
  const patch = slotA
    ? { teamAId: winnerTeamId, teamAName: winnerName }
    : { teamBId: winnerTeamId, teamBName: winnerName };
  await db.update(tournamentBracketMatches).set(patch).where(eq(tournamentBracketMatches.id, next.id));

  // Keep series legs in sync with the parent slot teams.
  const { syncSeriesTeams } = await import("@/lib/tournaments/brackets/series-legs");
  await syncSeriesTeams(tournamentId, next.id, patch);
}

export async function applyRoundOneSeeding(
  tournamentId: string,
  round1MatchIds: string[],
  teams: SeedTeam[],
): Promise<void> {
  const bracketSize = round1MatchIds.length * 2;
  const seeded: { id: string | null; name: string }[] = [...teams];
  while (seeded.length < bracketSize) {
    seeded.push({ id: null, name: "BYE" });
  }

  for (let i = 0; i < round1MatchIds.length; i++) {
    const teamA = seeded[i * 2];
    const teamB = seeded[i * 2 + 1];
    const matchId = round1MatchIds[i]!;

    if (teamA?.id == null || teamB?.id == null) {
      const winner = teamA?.id != null ? teamA : teamB;
      if (winner?.id != null) {
        await getDb()
          .update(tournamentBracketMatches)
          .set({
            teamAId: winner.id,
            teamAName: winner.name,
            teamBId: null,
            teamBName: "BYE",
            winnerTeamId: winner.id,
            status: "bye",
            completedAt: new Date(),
          })
          .where(eq(tournamentBracketMatches.id, matchId));
        await advanceWinnerToNextMatch(tournamentId, matchId, winner.id, winner.name);
      }
      continue;
    }

    await getDb()
      .update(tournamentBracketMatches)
      .set({
        teamAId: teamA.id,
        teamAName: teamA.name,
        teamBId: teamB.id,
        teamBName: teamB.name,
        status: "pending",
      })
      .where(eq(tournamentBracketMatches.id, matchId));

    const { syncSeriesTeams } = await import("@/lib/tournaments/brackets/series-legs");
    await syncSeriesTeams(tournamentId, matchId, {
      teamAId: teamA.id,
      teamAName: teamA.name,
      teamBId: teamB.id,
      teamBName: teamB.name,
    });
  }
}

export async function processRoundOneByesFromSlots(tournamentId: string): Promise<void> {
  const db = getDb();
  const round1 = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        eq(tournamentBracketMatches.roundNumber, 1),
      ),
    )
    .orderBy(tournamentBracketMatches.matchNumber);

  for (const match of round1) {
    const meta = match.metadata as Record<string, unknown> | null;
    if (meta && typeof meta.seriesParentId === "string") continue;
    if (match.status === "bye" || match.status === "completed") continue;

    const hasA = match.teamAId != null;
    const hasB = match.teamBId != null;

    if (hasA && hasB) continue;

    if (!hasA && !hasB) continue;

    const winner =
      hasA && match.teamAId
        ? { id: match.teamAId, name: match.teamAName ?? "Team" }
        : hasB && match.teamBId
          ? { id: match.teamBId, name: match.teamBName ?? "Team" }
          : null;

    if (!winner) continue;

    await db
      .update(tournamentBracketMatches)
      .set({
        teamAId: hasA ? match.teamAId : winner.id,
        teamAName: hasA ? match.teamAName : winner.name,
        teamBId: hasA ? null : match.teamBId,
        teamBName: hasA ? "BYE" : match.teamBName,
        winnerTeamId: winner.id,
        status: "bye",
        completedAt: new Date(),
      })
      .where(eq(tournamentBracketMatches.id, match.id));

    await advanceWinnerToNextMatch(tournamentId, match.id, winner.id, winner.name);
  }
}
