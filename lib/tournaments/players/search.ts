import "server-only";

import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { wikiEntities } from "@/db/schema/wiki";

export type TournamentPlayerSearchResult = {
  userId: string;
  displayName: string;
  nickname: string | null;
  email: string;
  wikiSlug: string | null;
  image: string | null;
};

export async function searchTournamentPlayers(
  sportId: string,
  query: string,
  limit = 12,
): Promise<TournamentPlayerSearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const pattern = `%${term}%`;
  const db = getDb();

  const rows = await db
    .select({
      userId: user.id,
      displayName: user.name,
      nickname: user.nickname,
      email: user.email,
      image: user.image,
      wikiSlug: wikiEntities.slug,
    })
    .from(user)
    .leftJoin(
      wikiEntities,
      and(
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "player"),
        eq(wikiEntities.status, "published"),
      ),
    )
    .where(
      and(
        eq(user.isActive, true),
        or(
          ilike(user.name, pattern),
          ilike(user.email, pattern),
          ilike(user.nickname, pattern),
          ilike(wikiEntities.displayName, pattern),
        ),
      ),
    )
    .limit(limit);

  const seen = new Set<string>();
  const results: TournamentPlayerSearchResult[] = [];

  for (const row of rows) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    results.push({
      userId: row.userId,
      displayName: row.displayName,
      nickname: row.nickname,
      email: row.email,
      wikiSlug: row.wikiSlug,
      image: row.image,
    });
  }

  return results;
}
