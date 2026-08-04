import "server-only";

import { and, asc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { tournaments } from "@/db/schema/tournaments";
import { wikiEntities } from "@/db/schema/wiki";
import { publicSportRoutes } from "@/lib/constants/routes";
import { resolveTournamentCoverUrl } from "@/lib/tournaments/resolve-cover";
import { mapGearEntityToListItem } from "@/lib/wiki/gear/mapper";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
import { searchPublishedNews } from "@/lib/news/search";
import type { GlobalSearchResultType } from "@/lib/wiki/global-search-types";

export type { GlobalSearchResultType } from "@/lib/wiki/global-search-types";
export {
  GLOBAL_SEARCH_PLACEHOLDER,
  GLOBAL_SEARCH_RESULT_TYPES,
} from "@/lib/wiki/global-search-types";

export type GlobalSearchResult = {
  type: GlobalSearchResultType;
  id: string;
  slug: string;
  sportSlug: string | null;
  sportName: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  href: string;
};

export type GlobalSearchResponse = {
  query: string;
  sportSlug: string | null;
  results: GlobalSearchResult[];
  totals: Record<GlobalSearchResultType, number>;
};

const EMPTY_TOTALS: Record<GlobalSearchResultType, number> = {
  player: 0,
  gear: 0,
  tournament: 0,
  news: 0,
};

function normalizeGlobalSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 100);
}

async function resolveLiveSportFilter(sportSlug?: string) {
  if (sportSlug) {
    const [sport] = await getDb()
      .select({ id: sports.id, slug: sports.slug, name: sports.name })
      .from(sports)
      .where(
        and(
          eq(sports.slug, sportSlug),
          eq(sports.isActive, true),
          eq(sports.visibility, "live"),
        ),
      )
      .limit(1);
    return sport ? [sport] : [];
  }

  return getDb()
    .select({ id: sports.id, slug: sports.slug, name: sports.name })
    .from(sports)
    .where(and(eq(sports.isActive, true), eq(sports.visibility, "live")));
}

async function searchPlayers(
  sportIds: string[],
  sportById: Map<string, { slug: string; name: string }>,
  term: string,
  limit: number,
): Promise<GlobalSearchResult[]> {
  if (!sportIds.length) return [];

  const rows = await getDb()
    .select({
      id: wikiEntities.id,
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      nickname: wikiEntities.nickname,
      summary: wikiEntities.summary,
      sportId: wikiEntities.sportId,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
    })
    .from(wikiEntities)
    .where(
      and(
        inArray(wikiEntities.sportId, sportIds),
        eq(wikiEntities.entityType, "player"),
        eq(wikiEntities.status, "published"),
        or(
          ilike(wikiEntities.displayName, term),
          ilike(wikiEntities.nickname, term),
          ilike(wikiEntities.summary, term),
        )!,
      ),
    )
    .orderBy(asc(wikiEntities.displayName))
    .limit(limit);

  return rows.flatMap((row) => {
    const sport = sportById.get(row.sportId);
    if (!sport) return [];
    return [
      {
        type: "player" as const,
        id: row.id,
        slug: row.slug,
        sportSlug: sport.slug,
        sportName: sport.name,
        title: row.displayName,
        subtitle: row.nickname ?? stripPlainText(row.summary),
        imageUrl: resolveWikiImageUrl(row.primaryImageUrl, row.primaryImageStorageKey),
        href: publicSportRoutes.player(sport.slug, row.slug),
      },
    ];
  });
}

async function searchGear(
  sportIds: string[],
  sportById: Map<string, { slug: string; name: string }>,
  term: string,
  limit: number,
): Promise<GlobalSearchResult[]> {
  if (!sportIds.length) return [];

  const rows = await getDb()
    .select({
      id: wikiEntities.id,
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      sportId: wikiEntities.sportId,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
      attributes: wikiEntities.attributes,
    })
    .from(wikiEntities)
    .where(
      and(
        inArray(wikiEntities.sportId, sportIds),
        eq(wikiEntities.entityType, "gear"),
        eq(wikiEntities.status, "published"),
        or(
          ilike(wikiEntities.displayName, term),
          ilike(wikiEntities.nickname, term),
          ilike(wikiEntities.slug, term),
        )!,
      ),
    )
    .orderBy(asc(wikiEntities.displayName))
    .limit(limit);

  return rows.flatMap((row) => {
    const sport = sportById.get(row.sportId);
    if (!sport) return [];
    const gear = mapGearEntityToListItem(row);
    return [
      {
        type: "gear" as const,
        id: row.id,
        slug: row.slug,
        sportSlug: sport.slug,
        sportName: sport.name,
        title: gear.displayName,
        subtitle: gear.brand ?? gear.gearCategoryLabel,
        imageUrl: gear.primaryImageUrl,
        href: publicSportRoutes.gearItem(sport.slug, row.slug),
      },
    ];
  });
}

async function searchTournaments(
  sportIds: string[],
  sportById: Map<string, { slug: string; name: string }>,
  term: string,
  limit: number,
): Promise<GlobalSearchResult[]> {
  if (!sportIds.length) return [];

  const rows = await getDb()
    .select({
      id: tournaments.id,
      slug: tournaments.slug,
      name: tournaments.name,
      venue: tournaments.venue,
      status: tournaments.status,
      sportId: tournaments.sportId,
      coverImageUrl: tournaments.coverImageUrl,
      coverImageStorageKey: tournaments.coverImageStorageKey,
    })
    .from(tournaments)
    .where(
      and(
        // Gud Game search only — partner white-label events stay on /{partnerSlug}
        isNull(tournaments.partnerId),
        inArray(tournaments.sportId, sportIds),
        or(
          eq(tournaments.status, "live"),
          eq(tournaments.status, "upcoming"),
          eq(tournaments.status, "completed"),
        )!,
        or(
          ilike(tournaments.name, term),
          ilike(tournaments.venue, term),
          ilike(tournaments.categoryLabel, term),
        )!,
      ),
    )
    .orderBy(asc(tournaments.name))
    .limit(limit);

  return rows.flatMap((row) => {
    const sport = sportById.get(row.sportId);
    if (!sport) return [];
    return [
      {
        type: "tournament" as const,
        id: row.id,
        slug: row.slug,
        sportSlug: sport.slug,
        sportName: sport.name,
        title: row.name,
        subtitle: [row.venue, row.status].filter(Boolean).join(" · ") || null,
        imageUrl: resolveTournamentCoverUrl(row.coverImageUrl, row.coverImageStorageKey),
        href: publicSportRoutes.tournament(sport.slug, row.slug),
      },
    ];
  });
}

function stripPlainText(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length ? text.slice(0, 120) : null;
}

async function searchNews(query: string, limit: number): Promise<GlobalSearchResult[]> {
  const rows = await searchPublishedNews(query, limit);
  return rows.map((row) => ({
    type: "news" as const,
    id: row.id,
    slug: row.slug,
    sportSlug: null,
    sportName: null,
    title: row.title,
    subtitle: row.excerpt,
    imageUrl: row.coverImageUrl,
    href: `/news/${row.slug}`,
  }));
}

export async function searchGlobally(input: {
  query: string;
  sportSlug?: string;
  limitPerType?: number;
}): Promise<GlobalSearchResponse> {
  const query = normalizeGlobalSearchQuery(input.query);
  const limitPerType = input.limitPerType ?? 8;

  if (query.length < 2) {
    return {
      query,
      sportSlug: input.sportSlug ?? null,
      results: [],
      totals: { ...EMPTY_TOTALS },
    };
  }

  const liveSports = await resolveLiveSportFilter(input.sportSlug);
  const term = `%${query}%`;

  const [players, gear, tournamentRows, newsRows] = await Promise.all([
    liveSports.length
      ? searchPlayers(
          liveSports.map((s) => s.id),
          new Map(liveSports.map((s) => [s.id, { slug: s.slug, name: s.name }])),
          term,
          limitPerType,
        )
      : Promise.resolve([]),
    liveSports.length
      ? searchGear(
          liveSports.map((s) => s.id),
          new Map(liveSports.map((s) => [s.id, { slug: s.slug, name: s.name }])),
          term,
          limitPerType,
        )
      : Promise.resolve([]),
    liveSports.length
      ? searchTournaments(
          liveSports.map((s) => s.id),
          new Map(liveSports.map((s) => [s.id, { slug: s.slug, name: s.name }])),
          term,
          limitPerType,
        )
      : Promise.resolve([]),
    searchNews(query, limitPerType),
  ]);

  const results = [...players, ...gear, ...tournamentRows, ...newsRows];

  return {
    query,
    sportSlug: input.sportSlug ?? null,
    results,
    totals: {
      player: players.length,
      gear: gear.length,
      tournament: tournamentRows.length,
      news: newsRows.length,
    },
  };
}
