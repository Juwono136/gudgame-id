import "server-only";

import { and, eq, ilike, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { createWikiEntity } from "@/lib/wiki/service";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { gearProductToAttributes } from "@/lib/wiki/gear/mapper";
import { playerGearCreateSchema } from "@/lib/wiki/gear/validation";
import type { GearSearchListItem } from "@/lib/wiki/gear/mapper";
import { mapGearEntityToListItem } from "@/lib/wiki/gear/mapper";

export async function createPlayerPublishedGear(input: {
  sportId: string;
  ownerUserId: string;
  displayName: string;
  brand: string;
  gearCategory: string;
  priceIdr?: number | null;
  notes?: string;
  primaryImageUrl?: string;
  primaryImageStorageKey?: string;
}): Promise<GearSearchListItem> {
  const parsed = playerGearCreateSchema.parse({
    displayName: input.displayName,
    brand: input.brand,
    gearCategory: input.gearCategory,
    priceIdr: input.priceIdr,
    notes: input.notes,
  });

  const attrs = gearProductToAttributes({
    brand: parsed.brand,
    model: "",
    gearCategory: parsed.gearCategory,
    priceIdr:
      parsed.priceIdr != null && parsed.priceIdr > 0 ? String(parsed.priceIdr) : "",
  });

  const entity = await createWikiEntity(
    input.sportId,
    {
      entityType: "gear",
      displayName: parsed.displayName,
      slug: slugifyWikiName(parsed.displayName),
      summary: parsed.notes?.trim() || undefined,
      status: "published",
      attributes: attrs,
      performance: {},
      specs: {},
      features: [],
      sourceType: "manual",
      relations: [],
      gallery: [],
      primaryImageUrl: input.primaryImageUrl,
    },
    input.ownerUserId,
    input.primaryImageUrl || input.primaryImageStorageKey
      ? {
          primaryUrl: input.primaryImageUrl,
          primaryStorageKey: input.primaryImageStorageKey,
        }
      : undefined,
    { ownerUserId: input.ownerUserId },
  );

  return mapGearEntityToListItem({
    id: entity.id,
    slug: entity.slug,
    displayName: entity.displayName,
    primaryImageUrl: entity.primaryImageUrl,
    primaryImageStorageKey: entity.primaryImageStorageKey,
    attributes: entity.attributes as Record<string, unknown>,
  });
}

export async function findGearByNameBrand(
  sportId: string,
  name: string,
  brand?: string | null,
): Promise<{ id: string } | null> {
  const db = getDb();
  const conditions = [
    eq(wikiEntities.sportId, sportId),
    eq(wikiEntities.entityType, "gear"),
    eq(wikiEntities.status, "published"),
    ilike(wikiEntities.displayName, name.trim()),
  ];

  const rows = await db
    .select({ id: wikiEntities.id, attributes: wikiEntities.attributes })
    .from(wikiEntities)
    .where(and(...conditions))
    .limit(5);

  if (!brand?.trim()) return rows[0] ?? null;

  const brandLower = brand.trim().toLowerCase();
  const match = rows.find((row) => {
    const attrs = (row.attributes ?? {}) as Record<string, unknown>;
    const rowBrand = typeof attrs.brand === "string" ? attrs.brand.toLowerCase() : "";
    return rowBrand === brandLower;
  });

  return match ?? rows[0] ?? null;
}

export async function validatePlayerGearLinks(
  sportId: string,
  equipment: { gearEntityId?: string }[],
): Promise<void> {
  const ids = [...new Set(equipment.map((e) => e.gearEntityId).filter(Boolean))] as string[];
  if (ids.length === 0) return;

  const db = getDb();
  const rows = await db
    .select({ id: wikiEntities.id })
    .from(wikiEntities)
    .where(
      and(
        inArray(wikiEntities.id, ids),
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "gear"),
        eq(wikiEntities.status, "published"),
      ),
    );

  if (rows.length !== ids.length) {
    throw new AppError("One or more linked gear items are invalid or unpublished", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
}
