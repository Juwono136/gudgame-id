import type { WikiEntityType } from "@/db/schema/wiki";

export type WikiDirectoryTypeFilter = WikiEntityType | "tournament";

export type WikiDirectoryListItem = {
  recordKind: "wiki_entity" | "tournament";
  id: number;
  sportId: number;
  sportSlug: string;
  sportName: string;
  entityType: WikiDirectoryTypeFilter;
  slug: string;
  displayName: string;
  nickname: string | null;
  summary: string | null;
  status: string;
  primaryImageUrl: string | null;
  sourceType: string;
  updatedAt: string;
  createdAt: string;
};

/** Stable React key — wiki entity id 1 and tournament id 1 are different records. */
export function getWikiDirectoryItemKey(item: WikiDirectoryListItem): string {
  return `${item.recordKind}:${item.id}`;
}
