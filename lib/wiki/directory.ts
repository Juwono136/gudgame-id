import "server-only";

import type { WikiEntityType } from "@/db/schema/wiki";
import { listTournaments, type TournamentListItem } from "@/lib/tournaments/service";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";
import { listWikiEntities, type WikiEntityListItem } from "@/lib/wiki/service";

export type { WikiDirectoryListItem, WikiDirectoryTypeFilter } from "@/lib/wiki/directory-types";

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
    primaryImageUrl: null,
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

function toTournamentListQuery(query: WikiEntitiesListQuery): TournamentsListQuery {
  const status: TournamentsListQuery["status"] =
    query.status === "draft" ? "draft" : "all";

  return {
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    status: status as TournamentsListQuery["status"],
    sortBy: query.sortBy === "name" ? "name" : "updated",
    sortDir: query.sortDir,
  };
}

export async function listWikiDirectory(sportId: number, query: WikiEntitiesListQuery) {
  if (query.entityType === "tournament") {
    const result = await listTournaments(sportId, toTournamentListQuery(query));
    return {
      items: result.items.map(mapTournamentRow),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
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
  const result = await listWikiEntities(sportId, wikiQuery);
  return {
    ...result,
    items: result.items.map(mapWikiRow),
  };
}
