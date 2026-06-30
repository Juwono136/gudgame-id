import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema";

export async function listOwnedPlayerEntityIds(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ id: wikiEntities.id })
    .from(wikiEntities)
    .where(
      and(eq(wikiEntities.ownerUserId, userId), eq(wikiEntities.entityType, "player")),
    );
  return rows.map((row) => row.id);
}
