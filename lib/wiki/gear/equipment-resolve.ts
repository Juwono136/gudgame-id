import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema";
import { mapGearEntityToListItem } from "@/lib/wiki/gear/mapper";
import {
  createPlayerPublishedGear,
  findGearByNameBrand,
} from "@/lib/wiki/gear/player-create";
import type { PlayerEquipmentItem } from "@/lib/wiki/player-equipment";
import { GEAR_CATEGORY_LABELS, type GearCategory } from "@/lib/wiki/gear/constants";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";

export type ResolvedPlayerEquipmentItem = PlayerEquipmentItem & {
  gearSlug?: string | null;
  gearPublicUrl?: string | null;
  priceDisplay?: string | null;
};

export async function migrateAndResolvePlayerEquipment(
  sportId: string,
  sportSlug: string,
  items: PlayerEquipmentItem[],
  ownerUserId?: string | null,
): Promise<ResolvedPlayerEquipmentItem[]> {
  const db = getDb();
  const resolved: ResolvedPlayerEquipmentItem[] = [];
  let changed = false;

  for (const item of items) {
    let gearEntityId = item.gearEntityId;

    if (!gearEntityId && item.name?.trim() && ownerUserId) {
      const existing = await findGearByNameBrand(sportId, item.name, item.brand);
      if (existing) {
        gearEntityId = existing.id;
        changed = true;
      } else if (item.name.trim().length >= 2) {
        const created = await createPlayerPublishedGear({
          sportId,
          ownerUserId,
          displayName: item.name.trim(),
          brand: item.brand?.trim() || "Unknown",
          gearCategory: item.category ?? "other",
          notes: item.notes,
          primaryImageUrl: item.imageUrl || undefined,
        });
        gearEntityId = created.id;
        changed = true;
      }
    }

    if (gearEntityId) {
      const [row] = await db
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
            eq(wikiEntities.id, gearEntityId),
            eq(wikiEntities.sportId, sportId),
            eq(wikiEntities.entityType, "gear"),
            eq(wikiEntities.status, "published"),
          ),
        )
        .limit(1);

      if (row) {
        const mapped = mapGearEntityToListItem(row);
        const category = normalizeGearCategory(
          String((row.attributes as Record<string, unknown>)?.gearCategory ?? item.category),
        );
        resolved.push({
          ...item,
          gearEntityId,
          name: row.displayName,
          brand: mapped.brand ?? item.brand,
          category: category as PlayerEquipmentItem["category"],
          imageUrl: mapped.primaryImageUrl ?? item.imageUrl,
          gearSlug: row.slug,
          gearPublicUrl: `/sports/${sportSlug}/gear/${row.slug}`,
          priceDisplay: mapped.priceDisplay,
        });
        continue;
      }
    }

    resolved.push({
      ...item,
      gearEntityId,
      category: item.category ?? "other",
      name: item.name ?? "",
    });
  }

  if (changed) {
    return resolved.map((item) => ({
      id: item.id,
      gearEntityId: item.gearEntityId,
      name: item.name,
      category: item.category,
      brand: item.brand,
      notes: item.notes,
      imageUrl: item.imageUrl,
      imageStorageKey: item.imageStorageKey,
      gearSlug: item.gearSlug,
      gearPublicUrl: item.gearPublicUrl,
      priceDisplay: item.priceDisplay,
    }));
  }

  return resolved;
}

export async function enrichEquipmentFromCatalog(
  sportId: string,
  sportSlug: string,
  items: PlayerEquipmentItem[],
): Promise<ResolvedPlayerEquipmentItem[]> {
  const ids = items.map((i) => i.gearEntityId).filter(Boolean) as string[];
  if (ids.length === 0) return items;

  const db = getDb();
  const rows = await db
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
        inArray(wikiEntities.id, ids),
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "gear"),
      ),
    );

  const byId = new Map(rows.map((r) => [r.id, r]));

  return items.map((item) => {
    if (!item.gearEntityId) return item;
    const row = byId.get(item.gearEntityId);
    if (!row) return item;
    const mapped = mapGearEntityToListItem(row);
    const category = normalizeGearCategory(
      String((row.attributes as Record<string, unknown>)?.gearCategory ?? item.category),
    );
    return {
      ...item,
      name: row.displayName,
      brand: mapped.brand ?? item.brand,
      category: category as PlayerEquipmentItem["category"],
      imageUrl: mapped.primaryImageUrl ?? item.imageUrl,
      gearSlug: row.slug,
      gearPublicUrl: `/sports/${sportSlug}/gear/${row.slug}`,
      priceDisplay: mapped.priceDisplay,
    };
  });
}

export function gearCategoryLabel(category: string): string {
  const key = normalizeGearCategory(category) as GearCategory;
  return GEAR_CATEGORY_LABELS[key] ?? category;
}
