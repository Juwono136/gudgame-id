import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports, wikiEntities, type WikiEntityType } from "@/db/schema";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
import { getSportDetailBySlug } from "@/lib/sports/service";
import type { PublicPlayersListQuery } from "@/lib/validations/public-wiki";

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

export type PublicPlayerListItem = {
  rank: number;
  slug: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  province: string | null;
  points: number | null;
  tier: string | null;
  playingStyle: string | null;
};

function readPlayerField(
  raw: unknown,
  key: string,
): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPlayerNumber(raw: unknown, key: string): number | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function listPublishedPlayersPaginated(
  sportSlug: string,
  query: PublicPlayersListQuery,
): Promise<{
  items: PublicPlayerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = getDb();
  const { page, pageSize, search, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(sports.slug, sportSlug),
    eq(wikiEntities.entityType, "player"),
    eq(wikiEntities.status, "published"),
  ];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(wikiEntities.displayName, term),
        ilike(wikiEntities.nickname, term),
        ilike(wikiEntities.summary, term),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);

  const pointsExpr = sql<number>`COALESCE((${wikiEntities.performance}->>'totalPoints')::numeric, 0)`;
  const nameExpr = wikiEntities.displayName;
  const orderFn = sortDir === "asc" ? asc : desc;
  const orderCol =
    sortBy === "name" ? nameExpr : sortBy === "rank" ? pointsExpr : pointsExpr;

  const rows = await db
    .select({
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      nickname: wikiEntities.nickname,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
      attributes: wikiEntities.attributes,
      performance: wikiEntities.performance,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderFn(orderCol), asc(wikiEntities.displayName))
    .limit(pageSize)
    .offset(offset);

  const items: PublicPlayerListItem[] = rows.map((row, index) => ({
    rank: offset + index + 1,
    slug: row.slug,
    displayName: row.displayName,
    nickname: row.nickname,
    avatarUrl: resolveWikiImageUrl(row.primaryImageUrl, row.primaryImageStorageKey),
    province:
      readPlayerField(row.attributes, "nationality") ??
      readPlayerField(row.attributes, "province"),
    points: readPlayerNumber(row.performance, "totalPoints"),
    tier: readPlayerField(row.attributes, "tier"),
    playingStyle: readPlayerField(row.attributes, "playingStyle"),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
