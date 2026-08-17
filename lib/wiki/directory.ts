import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { tournaments } from "@/db/schema/tournaments";
import type { WikiEntityType } from "@/db/schema/wiki";
import { wikiEntities } from "@/db/schema/wiki";
import { toTotalPages } from "@/lib/pagination/constants";
import { resolveTournamentCoverUrl } from "@/lib/tournaments/resolve-cover";
import { getTournamentStats } from "@/lib/tournaments/service";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
import { adminWikiEntityVisibilityCondition } from "@/lib/wiki/admin-entity-access";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";
import { getWikiEntityStats, listWikiEntities } from "@/lib/wiki/service";

export type { WikiDirectoryListItem, WikiDirectoryTypeFilter } from "@/lib/wiki/directory-types";

export type WikiDirectoryOptions = {
  /** Admin wiki: only tournaments created by this user. */
  tournamentCreatedBy?: string;
  /** Admin wiki: exclude signup/self-managed player profiles from listings. */
  adminUserId?: string;
};

type DirectoryRow = {
  record_kind: "wiki_entity" | "tournament";
  id: string;
  sport_id: string;
  sport_slug: string;
  sport_name: string;
  entity_type: string;
  slug: string;
  display_name: string;
  nickname: string | null;
  summary: string | null;
  status: string;
  primary_image_url: string | null;
  cover_image_storage_key: string | null;
  source_type: string;
  updated_at: Date | string;
  created_at: Date | string;
};

function escapeIlike(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Map wiki directory status filter → tournament statuses. */
function tournamentStatusesForWikiFilter(
  status: WikiEntitiesListQuery["status"],
): string[] | null {
  if (status === "all") return null;
  if (status === "draft") return ["draft"];
  if (status === "archived") return ["cancelled"];
  if (status === "published") return ["upcoming", "live", "completed"];
  return null;
}

function mapUnionRow(row: DirectoryRow): WikiDirectoryListItem {
  const isTournament = row.record_kind === "tournament";
  const primaryImageUrl = isTournament
    ? resolveTournamentCoverUrl(row.primary_image_url, row.cover_image_storage_key)
    : row.primary_image_url;

  return {
    recordKind: isTournament ? "tournament" : "wiki_entity",
    id: row.id,
    sportId: row.sport_id,
    sportSlug: row.sport_slug,
    sportName: row.sport_name,
    entityType: isTournament
      ? "tournament"
      : (row.entity_type as WikiDirectoryListItem["entityType"]),
    slug: row.slug,
    displayName: row.display_name,
    nickname: row.nickname,
    summary: row.summary,
    status: row.status,
    primaryImageUrl,
    sourceType: row.source_type,
    updatedAt: toIso(row.updated_at),
    createdAt: toIso(row.created_at),
  };
}

function sortSql(
  sortBy: WikiEntitiesListQuery["sortBy"],
  sortDir: WikiEntitiesListQuery["sortDir"],
): SQL {
  const dir = sortDir === "asc" ? sql`asc` : sql`desc`;
  if (sortBy === "name") {
    return sql`order by display_name ${dir}, id ${dir}`;
  }
  if (sortBy === "created") {
    return sql`order by created_at ${dir}, id ${dir}`;
  }
  return sql`order by updated_at ${dir}, id ${dir}`;
}

function wikiSearchCondition(term: string | undefined): SQL | undefined {
  if (!term?.trim()) return undefined;
  const pattern = `%${escapeIlike(term.trim())}%`;
  return sql`(
    ${wikiEntities.displayName} ilike ${pattern} escape '\\'
    or coalesce(${wikiEntities.nickname}, '') ilike ${pattern} escape '\\'
    or ${wikiEntities.slug} ilike ${pattern} escape '\\'
  )`;
}

function tournamentSearchCondition(term: string | undefined): SQL | undefined {
  if (!term?.trim()) return undefined;
  const pattern = `%${escapeIlike(term.trim())}%`;
  return sql`(
    ${tournaments.name} ilike ${pattern} escape '\\'
    or coalesce(${tournaments.summary}, '') ilike ${pattern} escape '\\'
    or coalesce(${tournaments.venue}, '') ilike ${pattern} escape '\\'
    or ${tournaments.slug} ilike ${pattern} escape '\\'
  )`;
}

function wikiStatusCondition(status: WikiEntitiesListQuery["status"]): SQL | undefined {
  if (status === "all") return undefined;
  return sql`${wikiEntities.status} = ${status}`;
}

function tournamentStatusCondition(status: WikiEntitiesListQuery["status"]): SQL | undefined {
  const statuses = tournamentStatusesForWikiFilter(status);
  if (!statuses) return undefined;
  return sql`${tournaments.status} in (${sql.join(
    statuses.map((s) => sql`${s}`),
    sql`, `,
  )})`;
}

/**
 * True SQL UNION ALL + LIMIT/OFFSET for the combined wiki + tournament directory.
 * Scales beyond the previous in-memory 500-row merge.
 */
async function listMergedWikiDirectory(
  sportId: string,
  query: WikiEntitiesListQuery,
  options?: WikiDirectoryOptions,
) {
  const db = getDb();
  const offset = (query.page - 1) * query.pageSize;

  const wikiVisibility = options?.adminUserId
    ? adminWikiEntityVisibilityCondition(options.adminUserId)
    : sql`true`;

  const wikiParts: SQL[] = [
    sql`${wikiEntities.sportId} = ${sportId}`,
    wikiVisibility,
  ];
  const wikiStatus = wikiStatusCondition(query.status);
  if (wikiStatus) wikiParts.push(wikiStatus);
  const wikiSearch = wikiSearchCondition(query.search);
  if (wikiSearch) wikiParts.push(wikiSearch);

  const tournamentParts: SQL[] = [
    sql`${tournaments.sportId} = ${sportId}`,
    sql`${tournaments.partnerId} is null`,
  ];
  if (options?.tournamentCreatedBy) {
    tournamentParts.push(sql`${tournaments.createdBy} = ${options.tournamentCreatedBy}`);
  }
  const tournamentStatus = tournamentStatusCondition(query.status);
  if (tournamentStatus) tournamentParts.push(tournamentStatus);
  const tournamentSearch = tournamentSearchCondition(query.search);
  if (tournamentSearch) tournamentParts.push(tournamentSearch);

  const wikiWhere = sql.join(wikiParts, sql` and `);
  const tournamentWhere = sql.join(tournamentParts, sql` and `);
  const order = sortSql(query.sortBy, query.sortDir);

  const unionBody = sql`
    (
      select
        'wiki_entity'::text as record_kind,
        ${wikiEntities.id}::text as id,
        ${wikiEntities.sportId} as sport_id,
        ${sports.slug} as sport_slug,
        ${sports.name} as sport_name,
        ${wikiEntities.entityType} as entity_type,
        ${wikiEntities.slug} as slug,
        ${wikiEntities.displayName} as display_name,
        ${wikiEntities.nickname} as nickname,
        ${wikiEntities.summary} as summary,
        ${wikiEntities.status} as status,
        ${wikiEntities.primaryImageUrl} as primary_image_url,
        null::text as cover_image_storage_key,
        ${wikiEntities.sourceType} as source_type,
        ${wikiEntities.updatedAt} as updated_at,
        ${wikiEntities.createdAt} as created_at
      from ${wikiEntities}
      inner join ${sports} on ${sports.id} = ${wikiEntities.sportId}
      where ${wikiWhere}
    )
    union all
    (
      select
        'tournament'::text as record_kind,
        ${tournaments.id}::text as id,
        ${tournaments.sportId} as sport_id,
        ${sports.slug} as sport_slug,
        ${sports.name} as sport_name,
        'tournament'::text as entity_type,
        ${tournaments.slug} as slug,
        ${tournaments.name} as display_name,
        null::text as nickname,
        ${tournaments.summary} as summary,
        ${tournaments.status} as status,
        ${tournaments.coverImageUrl} as primary_image_url,
        ${tournaments.coverImageStorageKey} as cover_image_storage_key,
        'manual'::text as source_type,
        ${tournaments.updatedAt} as updated_at,
        ${tournaments.createdAt} as created_at
      from ${tournaments}
      inner join ${sports} on ${sports.id} = ${tournaments.sportId}
      where ${tournamentWhere}
    )
  `;

  const countResult = await db.execute<{ count: string | number }>(sql`
    select count(*)::int as count from (${unionBody}) as directory
  `);
  const countRows = Array.isArray(countResult)
    ? countResult
    : ((countResult as { rows?: { count: string | number }[] }).rows ?? []);
  const total = Number(countRows[0]?.count ?? 0);
  const totalPages = toTotalPages(total, query.pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(query.page, 1), totalPages);
  const safeOffset = (safePage - 1) * query.pageSize;

  const rowResult = await db.execute<DirectoryRow>(sql`
    select * from (${unionBody}) as directory
    ${order}
    limit ${query.pageSize}
    offset ${safeOffset}
  `);
  const rows = Array.isArray(rowResult)
    ? rowResult
    : ((rowResult as { rows?: DirectoryRow[] }).rows ?? []);

  const items = rows.map(mapUnionRow);

  return {
    items,
    total,
    page: safePage,
    pageSize: query.pageSize,
    totalPages,
  };
}

async function listTournamentDirectoryPage(
  sportId: string,
  query: WikiEntitiesListQuery,
  options?: WikiDirectoryOptions,
) {
  const db = getDb();
  const conditions: SQL[] = [
    eq(tournaments.sportId, sportId),
    isNull(tournaments.partnerId),
  ];

  if (options?.tournamentCreatedBy) {
    conditions.push(eq(tournaments.createdBy, options.tournamentCreatedBy));
  }

  const statuses = tournamentStatusesForWikiFilter(query.status);
  if (statuses) {
    conditions.push(inArray(tournaments.status, statuses as [string, ...string[]]));
  }

  if (query.search?.trim()) {
    const term = `%${escapeIlike(query.search.trim())}%`;
    conditions.push(
      or(
        ilike(tournaments.name, term),
        ilike(tournaments.summary, term),
        ilike(tournaments.venue, term),
        ilike(tournaments.slug, term),
      )!,
    );
  }

  const whereClause = and(...conditions);
  const [totalRow] = await db
    .select({ count: count() })
    .from(tournaments)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const totalPages = toTotalPages(total, query.pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(query.page, 1), totalPages);
  const offset = (safePage - 1) * query.pageSize;

  const orderFn = query.sortDir === "asc" ? asc : desc;
  const orderCol =
    query.sortBy === "name"
      ? tournaments.name
      : query.sortBy === "created"
        ? tournaments.createdAt
        : tournaments.updatedAt;

  const rows = await db
    .select({
      id: tournaments.id,
      sportId: tournaments.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: tournaments.slug,
      name: tournaments.name,
      summary: tournaments.summary,
      status: tournaments.status,
      coverImageUrl: tournaments.coverImageUrl,
      coverImageStorageKey: tournaments.coverImageStorageKey,
      updatedAt: tournaments.updatedAt,
      createdAt: tournaments.createdAt,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderFn(orderCol), orderFn(tournaments.id))
    .limit(query.pageSize)
    .offset(offset);

  return {
    items: rows.map(
      (row): WikiDirectoryListItem => ({
        recordKind: "tournament",
        id: row.id,
        sportId: row.sportId,
        sportSlug: row.sportSlug,
        sportName: row.sportName,
        entityType: "tournament",
        slug: row.slug,
        displayName: row.name,
        nickname: null,
        summary: row.summary,
        status: row.status,
        primaryImageUrl: resolveTournamentCoverUrl(
          row.coverImageUrl,
          row.coverImageStorageKey,
        ),
        sourceType: "manual",
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }),
    ),
    total,
    page: safePage,
    pageSize: query.pageSize,
    totalPages,
  };
}

export async function listWikiDirectory(
  sportId: string,
  query: WikiEntitiesListQuery,
  options?: WikiDirectoryOptions,
) {
  if (query.entityType === "tournament") {
    return listTournamentDirectoryPage(sportId, query, options);
  }

  if (!query.entityType) {
    return listMergedWikiDirectory(sportId, query, options);
  }

  const wikiEntityType: WikiEntityType | undefined =
    query.entityType === "player" ||
    query.entityType === "gear" ||
    query.entityType === "team"
      ? query.entityType
      : undefined;

  const result = await listWikiEntities(
    sportId,
    { ...query, entityType: wikiEntityType },
    { adminUserId: options?.adminUserId },
  );

  return {
    ...result,
    totalPages: toTotalPages(result.total, result.pageSize),
    items: result.items.map((row) => ({
      ...row,
      recordKind: "wiki_entity" as const,
    })),
  };
}

export type WikiDirectoryStats = {
  player: number;
  gear: number;
  /** Wiki entities + tournaments matching directory “published” filter */
  published: number;
  /** Wiki entities + tournament drafts matching directory “draft” filter */
  draft: number;
  /** Draft wiki entities only (for bulk publish) */
  wikiDraft: number;
  tournaments: number;
  tournamentsLive: number;
  tournamentsUpcoming: number;
};

/** Aggregate directory stat cards — aligned with list filter status mapping. */
export async function getWikiDirectoryStats(
  sportId: string,
  options?: WikiDirectoryOptions,
): Promise<WikiDirectoryStats> {
  const [wikiStats, tournamentStats] = await Promise.all([
    getWikiEntityStats(sportId, options?.adminUserId),
    getTournamentStats(sportId, options?.tournamentCreatedBy),
  ]);

  const publishedTournaments =
    tournamentStats.upcoming + tournamentStats.live + tournamentStats.completed;

  return {
    player: wikiStats.player,
    gear: wikiStats.gear,
    published: wikiStats.published + publishedTournaments,
    draft: wikiStats.draft + tournamentStats.draft,
    wikiDraft: wikiStats.draft,
    tournaments: tournamentStats.total,
    tournamentsLive: tournamentStats.live,
    tournamentsUpcoming: tournamentStats.upcoming,
  };
}
