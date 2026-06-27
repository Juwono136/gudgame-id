import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports, wikiEntities } from "@/db/schema";
import { formatPlayerTierLabel, normalizePlayerTier } from "@/lib/player/tier";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
import { getPlayerCareerStats } from "@/lib/wiki/player-career-stats";
import { resolvePlayerCareerStats } from "@/lib/account/player-performance/resolve-career-stats";
import { parsePlayerEditableAttributes } from "@/lib/wiki/player-profile-fields";
import type { PublicPlayersListQuery } from "@/lib/validations/public-wiki";

export type PublicPlayerListItem = {
  rank: number;
  slug: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  nationality: string | null;
  province: string | null;
  age: number | null;
  points: number | null;
  tier: string | null;
  tierLevel: string | null;
  playingStyle: string | null;
  winRate: number | null;
  worldRank: number | null;
  yearsActive: string | null;
  summary: string | null;
};

function readPlayerField(raw: unknown, key: string): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stripRichTextSummary(html: string | null): string | null {
  if (!html?.trim()) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length ? text.slice(0, 160) : null;
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

  const rankExpr = sql<number>`(
    1 + (
      SELECT COUNT(*)::int
      FROM wiki_entities w2
      INNER JOIN sports s2 ON w2.sport_id = s2.id
      WHERE s2.slug = ${sportSlug}
        AND w2.entity_type = 'player'
        AND w2.status = 'published'
        AND COALESCE((w2.performance->>'totalPoints')::numeric, 0) > COALESCE((${wikiEntities.performance}->>'totalPoints')::numeric, 0)
    )
  )`;

  const rows = await db
    .select({
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      nickname: wikiEntities.nickname,
      summary: wikiEntities.summary,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
      attributes: wikiEntities.attributes,
      performance: wikiEntities.performance,
      ownerUserId: wikiEntities.ownerUserId,
      sportId: wikiEntities.sportId,
      rank: rankExpr,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderFn(orderCol), asc(wikiEntities.displayName))
    .limit(pageSize)
    .offset(offset);

  const items: PublicPlayerListItem[] = await Promise.all(
    rows.map(async (row) => {
      const attributes = (row.attributes ?? {}) as Record<string, unknown>;
      const performance = (row.performance ?? {}) as Record<string, unknown>;
      const editable = parsePlayerEditableAttributes(attributes);
      const career = await resolvePlayerCareerStats({
        entity: {
          id: row.slug,
          attributes,
          performance,
        },
        ownerUserId: row.ownerUserId,
        sportId: row.sportId,
      });

      const tierLevel =
        career.tierLevel ??
        normalizePlayerTier(readPlayerField(attributes, "tier")) ??
        "pemula";
      const tier = career.tier ?? formatPlayerTierLabel(tierLevel) ?? "Pemula";

      return {
        rank: Number(row.rank) || 1,
        slug: row.slug,
        displayName: row.displayName,
        nickname: row.nickname,
        avatarUrl: resolveWikiImageUrl(row.primaryImageUrl, row.primaryImageStorageKey),
        nationality: editable.nationality ?? readPlayerField(attributes, "nationality"),
        province: readPlayerField(attributes, "province"),
        age: editable.age ?? null,
        points: career.totalPoints,
        tier,
        tierLevel,
        playingStyle: readPlayerField(attributes, "playingStyle"),
        winRate: career.winRate,
        worldRank: career.worldRank ?? (Number(row.rank) || 1),
        yearsActive: career.yearsActive,
        summary: stripRichTextSummary(row.summary),
      };
    }),
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
