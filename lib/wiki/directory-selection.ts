import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";
import { getWikiDirectoryItemKey } from "@/lib/wiki/directory-types";

export const DIRECTORY_BULK_ACTION_MAX = 100;
/** @deprecated Use DIRECTORY_BULK_ACTION_MAX */
export const DIRECTORY_BULK_DELETE_MAX = DIRECTORY_BULK_ACTION_MAX;

export type DirectorySelectionEntry = {
  key: string;
  recordKind: WikiDirectoryListItem["recordKind"];
  id: string;
  displayName: string;
  status: string;
  deletable: boolean;
  publishable: boolean;
};

export function directorySelectionEntryFromItem(item: WikiDirectoryListItem): DirectorySelectionEntry {
  const publishable = item.recordKind === "wiki_entity" && item.status === "draft";
  const deletable =
    item.recordKind === "wiki_entity" ||
    (item.recordKind === "tournament" && item.status !== "live");

  return {
    key: getWikiDirectoryItemKey(item),
    recordKind: item.recordKind,
    id: String(item.id),
    displayName: item.displayName,
    status: item.status,
    deletable,
    publishable,
  };
}

export function partitionSelectionForBulkDelete(entries: DirectorySelectionEntry[]) {
  const wikiEntityIds: string[] = [];
  const tournamentIds: string[] = [];
  let skippedLive = 0;

  for (const entry of entries) {
    if (!entry.deletable) {
      skippedLive += 1;
      continue;
    }
    if (entry.recordKind === "wiki_entity") {
      wikiEntityIds.push(entry.id);
    } else {
      tournamentIds.push(entry.id);
    }
  }

  return { wikiEntityIds, tournamentIds, skippedLive };
}

export function partitionSelectionForBulkPublish(entries: DirectorySelectionEntry[]) {
  const wikiEntityIds: string[] = [];
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.publishable) {
      skipped += 1;
      continue;
    }
    wikiEntityIds.push(entry.id);
  }

  return { wikiEntityIds, skipped };
}

export function countPublishableSelection(
  selection: Map<string, DirectorySelectionEntry>,
): number {
  let count = 0;
  for (const entry of selection.values()) {
    if (entry.publishable) count += 1;
  }
  return count;
}

export function countSelectableSelection(
  selection: Map<string, DirectorySelectionEntry>,
): number {
  return selection.size;
}

export function countDeletableSelection(
  selection: Map<string, DirectorySelectionEntry>,
): number {
  let count = 0;
  for (const entry of selection.values()) {
    if (entry.deletable) count += 1;
  }
  return count;
}

export function countDeletableSelectionOnPage(
  selection: Map<string, DirectorySelectionEntry>,
  pageItems: WikiDirectoryListItem[],
  isDeletable: (item: WikiDirectoryListItem) => boolean,
): number {
  let count = 0;
  for (const item of pageItems) {
    if (!isDeletable(item)) continue;
    const key = getWikiDirectoryItemKey(item);
    const entry = selection.get(key);
    if (entry?.deletable) count += 1;
  }
  return count;
}
