import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema/wiki";
import { mapGearEntityToListItem } from "@/lib/wiki/gear/mapper";

export type TournamentGearRuleItem = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  brand: string | null;
  gearCategoryLabel: string | null;
  priceDisplay: string | null;
  primaryImageUrl: string | null;
};

export async function getGearEntitiesForTournamentRules(
  sportId: string,
  gearEntityIds: string[] | undefined,
  sportSlug?: string,
): Promise<TournamentGearRuleItem[]> {
  if (!gearEntityIds?.length) return [];

  const rows = await getDb()
    .select({
      id: wikiEntities.id,
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      summary: wikiEntities.summary,
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
        inArray(wikiEntities.id, gearEntityIds),
      ),
    );

  const order = new Map(gearEntityIds.map((id, i) => [id, i]));
  return rows
    .map((row) => {
      const mapped = mapGearEntityToListItem(row, sportSlug);
      return {
        id: mapped.id,
        slug: mapped.slug,
        displayName: mapped.displayName,
        summary: row.summary,
        brand: mapped.brand,
        gearCategoryLabel: mapped.gearCategoryLabel,
        priceDisplay: mapped.priceDisplay,
        primaryImageUrl: mapped.primaryImageUrl,
      };
    })
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
