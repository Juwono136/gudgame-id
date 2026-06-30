import "server-only";

import { AppError } from "@/lib/errors";
import { deleteTournament } from "@/lib/tournaments/service";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
import { listWikiDirectory, type WikiDirectoryOptions } from "@/lib/wiki/directory";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";
import { deleteWikiEntity } from "@/lib/wiki/service";

const BULK_DELETE_MAX = 100;

export type BulkDeleteSkipped = {
  id: string;
  recordKind: WikiDirectoryListItem["recordKind"];
  displayName: string;
  reason: string;
};

export type BulkDeleteFailed = {
  id: string;
  recordKind: WikiDirectoryListItem["recordKind"];
  displayName: string;
  error: string;
};

export type BulkDeleteDirectoryResult = {
  deletedWikiCount: number;
  deletedTournamentCount: number;
  skipped: BulkDeleteSkipped[];
  failed: BulkDeleteFailed[];
};

function canDeleteDirectoryItem(item: WikiDirectoryListItem): boolean {
  if (item.recordKind === "wiki_entity") return true;
  return item.recordKind === "tournament" && item.status !== "live";
}

function skipReason(item: WikiDirectoryListItem): string {
  if (item.recordKind === "tournament" && item.status === "live") {
    return "Live tournaments cannot be deleted. End or cancel the event first.";
  }
  return "This item cannot be deleted.";
}

async function deleteDirectoryItem(
  item: WikiDirectoryListItem,
  sportId: string,
  actorId: string,
): Promise<void> {
  if (item.recordKind === "wiki_entity") {
    await deleteWikiEntity(String(item.id), sportId, actorId);
    return;
  }
  await deleteTournament(String(item.id), sportId);
}

export async function bulkDeleteDirectoryItems(input: {
  sportId: string;
  actorId: string;
  wikiEntityIds: string[];
  tournamentIds: string[];
}): Promise<BulkDeleteDirectoryResult> {
  const wikiIds = [...new Set(input.wikiEntityIds)].slice(0, BULK_DELETE_MAX);
  const tournamentIds = [...new Set(input.tournamentIds)].slice(0, BULK_DELETE_MAX);

  if (wikiIds.length + tournamentIds.length > BULK_DELETE_MAX) {
    throw new AppError(`You can delete up to ${BULK_DELETE_MAX} items per request`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (wikiIds.length === 0 && tournamentIds.length === 0) {
    throw new AppError("No items selected for deletion", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const result: BulkDeleteDirectoryResult = {
    deletedWikiCount: 0,
    deletedTournamentCount: 0,
    skipped: [],
    failed: [],
  };

  for (const id of wikiIds) {
    try {
      await deleteWikiEntity(id, input.sportId, input.actorId);
      result.deletedWikiCount += 1;
    } catch (err) {
      result.failed.push({
        id,
        recordKind: "wiki_entity",
        displayName: id,
        error: err instanceof Error ? err.message : "Delete failed",
      });
    }
  }

  for (const id of tournamentIds) {
    try {
      await deleteTournament(id, input.sportId);
      result.deletedTournamentCount += 1;
    } catch (err) {
      result.failed.push({
        id,
        recordKind: "tournament",
        displayName: id,
        error: err instanceof Error ? err.message : "Delete failed",
      });
    }
  }

  return result;
}

export async function bulkDeleteDirectoryByFilter(input: {
  sportId: string;
  actorId: string;
  filter: WikiEntitiesListQuery;
  options?: WikiDirectoryOptions;
}): Promise<BulkDeleteDirectoryResult & { matched: number }> {
  const listing = await listWikiDirectory(
    input.sportId,
    { ...input.filter, page: 1, pageSize: BULK_DELETE_MAX },
    input.options,
  );

  const deletable = listing.items.filter(canDeleteDirectoryItem);
  const skipped = listing.items
    .filter((item) => !canDeleteDirectoryItem(item))
    .map((item) => ({
      id: String(item.id),
      recordKind: item.recordKind,
      displayName: item.displayName,
      reason: skipReason(item),
    }));

  const wikiEntityIds = deletable
    .filter((i) => i.recordKind === "wiki_entity")
    .map((i) => String(i.id));
  const tournamentIds = deletable
    .filter((i) => i.recordKind === "tournament")
    .map((i) => String(i.id));

  const result = await bulkDeleteDirectoryItems({
    sportId: input.sportId,
    actorId: input.actorId,
    wikiEntityIds,
    tournamentIds,
  });

  return {
    ...result,
    matched: listing.items.length,
    skipped: [...skipped, ...result.skipped],
  };
}
