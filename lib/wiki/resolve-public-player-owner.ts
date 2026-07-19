import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { wikiEntities } from "@/db/schema/wiki";
import { AppError } from "@/lib/errors";

export type PublicPlayerOwnerContext = {
  ownerUserId: string;
  sportId: string;
  sportSlug: string;
  playerSlug: string;
  displayName: string;
};

/** Resolve a published player wiki page to its owning user (for public competition APIs). */
export async function resolvePublicPlayerOwner(
  sportSlug: string,
  playerSlug: string,
): Promise<PublicPlayerOwnerContext> {
  const db = getDb();
  const [row] = await db
    .select({
      ownerUserId: wikiEntities.ownerUserId,
      sportId: wikiEntities.sportId,
      sportSlug: sports.slug,
      playerSlug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      status: wikiEntities.status,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(
      and(
        eq(sports.slug, sportSlug),
        eq(wikiEntities.slug, playerSlug),
        eq(wikiEntities.entityType, "player"),
      ),
    )
    .limit(1);

  if (!row || row.status !== "published") {
    throw new AppError("Player not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (!row.ownerUserId) {
    throw new AppError("This player profile has no linked account history yet", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  return {
    ownerUserId: row.ownerUserId,
    sportId: row.sportId,
    sportSlug: row.sportSlug,
    playerSlug: row.playerSlug,
    displayName: row.displayName,
  };
}
