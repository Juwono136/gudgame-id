import "server-only";

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema";
import { mapGearEntityToListItem, type GearSearchListItem } from "@/lib/wiki/gear/mapper";

export type SearchPublishedGearOptions = {
  sportId: string;
  query: string;
  limit?: number;
};

export async function searchPublishedGear(
  options: SearchPublishedGearOptions,
): Promise<GearSearchListItem[]> {
  const { sportId, query, limit = 15 } = options;
  const q = query.trim();
  if (q.length < 2) return [];

  const term = `%${q}%`;
  const rows = await getDb()
    .select({
      id: wikiEntities.id,
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
      attributes: wikiEntities.attributes,
    })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "gear"),
        eq(wikiEntities.status, "published"),
        or(
          ilike(wikiEntities.displayName, term),
          ilike(wikiEntities.nickname, term),
          ilike(wikiEntities.slug, term),
          sql`COALESCE(${wikiEntities.attributes}->>'brand', '') ILIKE ${term}`,
        )!,
      ),
    )
    .orderBy(asc(wikiEntities.displayName))
    .limit(limit);

  return rows.map((row) => mapGearEntityToListItem(row));
}
