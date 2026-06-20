import "server-only";

import type { WikiEntityType } from "@/db/schema/wiki";
import { listTournaments, type TournamentListItem } from "@/lib/tournaments/service";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";
import { listWikiEntities, type WikiEntityListItem } from "@/lib/wiki/service";

export type { WikiDirectoryListItem, WikiDirectoryTypeFilter } from "@/lib/wiki/directory-types";

const MERGED_FETCH_CAP = 500;

function mapTournamentRow(row: TournamentListItem): WikiDirectoryListItem {
  return {
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
    primaryImageUrl: row.coverImageUrl ?? null,
    sourceType: "manual",
    updatedAt: row.updatedAt,
    createdAt: row.updatedAt,
  };
}

function mapWikiRow(row: WikiEntityListItem): WikiDirectoryListItem {
  return {
    ...row,
    recordKind: "wiki_entity",
  };
}

export type WikiDirectoryOptions = {
  /** Admin wiki: only tournaments created by this user. */
  tournamentCreatedBy?: string;
  /** Admin wiki: exclude signup/self-managed player profiles from listings. */
  adminUserId?: string;
};

function toTournamentListQuery(
  query: WikiEntitiesListQuery,
  options?: WikiDirectoryOptions,
): TournamentsListQuery {
  const status: TournamentsListQuery["status"] =
    query.status === "draft" ? "draft" : "all";

  return {
    page: 1,
    pageSize: MERGED_FETCH_CAP,
    search: query.search,
    status: status as TournamentsListQuery["status"],
    createdBy: options?.tournamentCreatedBy,
    sortBy: query.sortBy === "name" ? "name" : "updated",
    sortDir: query.sortDir,
  };
}

function tournamentMatchesWikiStatus(
  status: WikiEntitiesListQuery["status"],
  tournamentStatus: string,
): boolean {
  if (status === "all") return true;
  if (status === "draft") return tournamentStatus === "draft";
  if (status === "archived") return tournamentStatus === "cancelled";
  if (status === "published") {
    return tournamentStatus === "upcoming" || tournamentStatus === "live" || tournamentStatus === "completed";
  }
  return true;
}

function sortDirectoryItems(
  items: WikiDirectoryListItem[],
  sortBy: WikiEntitiesListQuery["sortBy"],
  sortDir: WikiEntitiesListQuery["sortDir"],
): WikiDirectoryListItem[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortBy === "name") {
      return a.displayName.localeCompare(b.displayName) * dir;
    }
    const aTime = new Date(sortBy === "created" ? a.createdAt : a.updatedAt).getTime();
    const bTime = new Date(sortBy === "created" ? b.createdAt : b.updatedAt).getTime();
    return (aTime - bTime) * dir;
  });
}

function paginateDirectoryItems(
  items: WikiDirectoryListItem[],
  page: number,
  pageSize: number,
) {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

async function listMergedWikiDirectory(
  sportId: string,
  query: WikiEntitiesListQuery,
  options?: WikiDirectoryOptions,
) {
  const wikiQuery: WikiEntitiesListQuery = {
    ...query,
    entityType: undefined,
    page: 1,
    pageSize: MERGED_FETCH_CAP,
  };

  const [wikiResult, tournamentResult] = await Promise.all([
    listWikiEntities(sportId, wikiQuery, { adminUserId: options?.adminUserId }),
    listTournaments(sportId, toTournamentListQuery(query, options)),
  ]);

  const tournamentItems = tournamentResult.items
    .filter((row) => tournamentMatchesWikiStatus(query.status, row.status))
    .map(mapTournamentRow);

  const merged = sortDirectoryItems(
    [...wikiResult.items.map(mapWikiRow), ...tournamentItems],
    query.sortBy,
    query.sortDir,
  );

  return paginateDirectoryItems(merged, query.page, query.pageSize);
}

export async function listWikiDirectory(
  sportId: string,
  query: WikiEntitiesListQuery,
  options?: WikiDirectoryOptions,
) {
  if (query.entityType === "tournament") {
    const result = await listTournaments(sportId, {
      ...toTournamentListQuery(query, options),
      page: query.page,
      pageSize: query.pageSize,
    });
    const filtered = result.items.filter((row) =>
      tournamentMatchesWikiStatus(query.status, row.status),
    );
    return {
      items: filtered.map(mapTournamentRow),
      total:
        query.status === "all"
          ? result.total
          : filtered.length,
      page: result.page,
      pageSize: result.pageSize,
      totalPages:
        query.status === "all"
          ? result.totalPages
          : filtered.length === 0
            ? 0
            : Math.ceil(filtered.length / result.pageSize),
    };
  }

  const isAllTypes = !query.entityType;

  if (isAllTypes) {
    return listMergedWikiDirectory(sportId, query, options);
  }

  const wikiEntityType: WikiEntityType | undefined =
    query.entityType === "player" ||
    query.entityType === "gear" ||
    query.entityType === "team"
      ? query.entityType
      : undefined;

  const wikiQuery: WikiEntitiesListQuery = {
    ...query,
    entityType: wikiEntityType,
  };
  const result = await listWikiEntities(sportId, wikiQuery, { adminUserId: options?.adminUserId });
  return {
    ...result,
    items: result.items.map(mapWikiRow),
  };
}
