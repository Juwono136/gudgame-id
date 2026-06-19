import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema/wiki";

export type TournamentGearRuleItem = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
};

export async function getGearEntitiesForTournamentRules(
  sportId: string,
  gearEntityIds: string[] | undefined,
): Promise<TournamentGearRuleItem[]> {
  if (!gearEntityIds?.length) return [];

  const rows = await getDb()
    .select({
      id: wikiEntities.id,
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      summary: wikiEntities.summary,
    })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "gear"),
        eq(wikiEntities.status, "published"),
        inArray(wikiEntities.id, gearEntityIds),
      ),
    );

  const order = new Map(gearEntityIds.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
