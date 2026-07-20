import "server-only";

import { and, eq, inArray, like } from "drizzle-orm";
import { getDb } from "@/db/client";
import { account, user } from "@/db/schema/auth";
import {
  playerMatches,
  playerTournamentResults,
} from "@/db/schema/player-competition";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import { deleteTournament } from "@/lib/tournaments/service";

export const DOUBLE_STAGE_FIXTURE_SLUG = "dev-double-stage-32";
export const DOUBLE_STAGE_PLAYER_EMAIL_PREFIX = "ds32-p";
export const DOUBLE_STAGE_PLAYER_EMAIL_DOMAIN = "gudgame.local";

export type PurgeDoubleStageResult = {
  removed: boolean;
  tournamentId: string | null;
  paymentsDeleted: number;
  playerMatchesCleared: number;
  playerResultsCleared: number;
  seedPlayersDeleted: number;
};

/**
 * Fully remove a double-stage fixture tournament and dependent rows that would
 * block `ON DELETE` (payments are RESTRICT). Teams / groups / matches cascade.
 */
export async function purgeDoubleStageFixture(input: {
  sportId: string;
  tournamentSlug?: string;
  /** Also delete seeded ds32-p###@gudgame.local player accounts */
  purgeSeedPlayers?: boolean;
}): Promise<boolean> {
  const result = await purgeDoubleStageFixtureDetailed(input);
  return result.removed;
}

export async function purgeDoubleStageFixtureDetailed(input: {
  sportId: string;
  tournamentSlug?: string;
  purgeSeedPlayers?: boolean;
}): Promise<PurgeDoubleStageResult> {
  const db = getDb();
  const tournamentSlug = input.tournamentSlug ?? DOUBLE_STAGE_FIXTURE_SLUG;

  const [existing] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(
      and(
        eq(tournaments.sportId, input.sportId),
        eq(tournaments.slug, tournamentSlug),
      ),
    )
    .limit(1);

  if (!existing) {
    let seedPlayersDeleted = 0;
    if (input.purgeSeedPlayers) {
      seedPlayersDeleted = await deleteSeedPlayers();
    }
    return {
      removed: false,
      tournamentId: null,
      paymentsDeleted: 0,
      playerMatchesCleared: 0,
      playerResultsCleared: 0,
      seedPlayersDeleted,
    };
  }

  const tournamentId = existing.id;

  const deletedPayments = await db
    .delete(tournamentPayments)
    .where(eq(tournamentPayments.tournamentId, tournamentId))
    .returning({ id: tournamentPayments.id });

  const clearedMatches = await db
    .delete(playerMatches)
    .where(eq(playerMatches.tournamentId, tournamentId))
    .returning({ id: playerMatches.id });

  const clearedResults = await db
    .delete(playerTournamentResults)
    .where(eq(playerTournamentResults.tournamentId, tournamentId))
    .returning({ id: playerTournamentResults.id });

  await deleteTournament(tournamentId, input.sportId);

  let seedPlayersDeleted = 0;
  if (input.purgeSeedPlayers) {
    seedPlayersDeleted = await deleteSeedPlayers();
  }

  return {
    removed: true,
    tournamentId,
    paymentsDeleted: deletedPayments.length,
    playerMatchesCleared: clearedMatches.length,
    playerResultsCleared: clearedResults.length,
    seedPlayersDeleted,
  };
}

async function deleteSeedPlayers(): Promise<number> {
  const db = getDb();
  const pattern = `${DOUBLE_STAGE_PLAYER_EMAIL_PREFIX}%@${DOUBLE_STAGE_PLAYER_EMAIL_DOMAIN}`;
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, pattern));

  if (rows.length === 0) return 0;

  const ids = rows.map((r) => r.id);
  await db.delete(account).where(inArray(account.userId, ids));
  await db.delete(user).where(inArray(user.id, ids));
  return ids.length;
}
