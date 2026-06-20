import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports, wikiEntities } from "@/db/schema";
import { formatIdrDisplay } from "@/lib/format/currency";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
import {
  GEAR_CATEGORY_LABELS,
  type GearCategory,
} from "@/lib/wiki/gear/constants";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";
import { htmlExcerpt } from "@/lib/html/strip-html";
import type { PublicGearListQuery } from "@/lib/validations/public-wiki";

export type PublicGearListItem = {
  slug: string;
  displayName: string;
  summary: string | null;
  primaryImageUrl: string | null;
  brand: string | null;
  gearCategory: GearCategory;
  categoryLabel: string;
  priceDisplay: string | null;
  priceIdr: number | null;
};

function readPriceIdr(attrs: Record<string, unknown>): number | null {
  const raw = attrs.priceIdr ?? attrs.price;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  if (typeof raw === "string" && raw.trim()) {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits) {
      const n = Number(digits);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function readPriceDisplay(attrs: Record<string, unknown>, priceIdr: number | null): string | null {
  if (typeof attrs.priceDisplay === "string" && attrs.priceDisplay.trim()) {
    return attrs.priceDisplay.trim();
  }
  if (typeof attrs.price === "string" && attrs.price.trim()) return attrs.price.trim();
  if (priceIdr != null) return formatIdrDisplay(priceIdr);
  return null;
}

export async function listPublishedGearPaginated(
  sportSlug: string,
  query: PublicGearListQuery,
): Promise<{
  items: PublicGearListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = getDb();
  const { page, pageSize, search, category, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(sports.slug, sportSlug),
    eq(wikiEntities.entityType, "gear"),
    eq(wikiEntities.status, "published"),
  ];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(wikiEntities.displayName, term),
        ilike(wikiEntities.summary, term),
        sql`${wikiEntities.attributes}->>'brand' ILIKE ${term}`,
        sql`${wikiEntities.attributes}->>'model' ILIKE ${term}`,
      )!,
    );
  }

  if (category !== "all") {
    conditions.push(sql`${wikiEntities.attributes}->>'gearCategory' = ${category}`);
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const orderExpr =
    sortBy === "price"
      ? sortDir === "desc"
        ? desc(sql`COALESCE((${wikiEntities.attributes}->>'priceIdr')::numeric, 0)`)
        : asc(sql`COALESCE((${wikiEntities.attributes}->>'priceIdr')::numeric, 0)`)
      : sortBy === "newest"
        ? sortDir === "asc"
          ? asc(wikiEntities.publishedAt)
          : desc(wikiEntities.publishedAt)
        : sortDir === "desc"
          ? desc(wikiEntities.displayName)
          : asc(wikiEntities.displayName);

  const rows = await db
    .select({
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      summary: wikiEntities.summary,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
      attributes: wikiEntities.attributes,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(pageSize)
    .offset(offset);

  const items: PublicGearListItem[] = rows.map((row) => {
    const attrs = (row.attributes ?? {}) as Record<string, unknown>;
    const gearCategory = normalizeGearCategory(String(attrs.gearCategory ?? "other"));
    const priceIdr = readPriceIdr(attrs);
    return {
      slug: row.slug,
      displayName: row.displayName,
      summary: row.summary ? htmlExcerpt(row.summary, 100) : null,
      primaryImageUrl: resolveWikiImageUrl(
        row.primaryImageUrl,
        row.primaryImageStorageKey,
      ),
      brand: typeof attrs.brand === "string" && attrs.brand.trim() ? attrs.brand.trim() : null,
      gearCategory,
      categoryLabel: GEAR_CATEGORY_LABELS[gearCategory],
      priceDisplay: readPriceDisplay(attrs, priceIdr),
      priceIdr,
    };
  });

  return { items, total, page, pageSize, totalPages };
}
