import "server-only";

import { and, asc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports, wikiEntities, type WikiEntityType } from "@/db/schema";
import { getSportDetailBySlug } from "@/lib/sports/service";

export async function getSportBySlug(slug: string) {
  return getSportDetailBySlug(slug);
}

export async function listPublishedWikiEntities(
  sportSlug: string,
  entityType: WikiEntityType,
  options?: { search?: string; limit?: number },
) {
  const db = getDb();
  const conditions = [
    eq(sports.slug, sportSlug),
    eq(wikiEntities.entityType, entityType),
    eq(wikiEntities.status, "published"),
  ];

  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(wikiEntities.displayName, term),
        ilike(wikiEntities.nickname, term),
      )!,
    );
  }

  return db
    .select({
      id: wikiEntities.id,
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      nickname: wikiEntities.nickname,
      summary: wikiEntities.summary,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      entityType: wikiEntities.entityType,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(and(...conditions))
    .orderBy(asc(wikiEntities.displayName))
    .limit(options?.limit ?? 50);
}
