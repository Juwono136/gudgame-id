import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { WikiCatalogListItem } from "@/lib/wiki/scrapers/types";
import {
  normalizeCatalogProductUrl,
  type GearImportProcessedEntry,
} from "@/lib/wiki/gear-import-session";

type SourceUrlStatusRow = {
  url: string;
  imported: boolean;
  entityId: string | null;
  displayName: string | null;
  status: string | null;
  slug: string | null;
};

const RECENT_SAVE_GRACE_MS = 45_000;

/**
 * Reconcile import markers with the database (source of truth).
 * Drops stale session entries that are not backed by a wiki entity.
 */
export async function mergeGearImportStatusesFromApi(
  items: WikiCatalogListItem[],
  currentProcessed: Record<string, GearImportProcessedEntry>,
): Promise<Record<string, GearImportProcessedEntry>> {
  if (items.length === 0) return {};

  const catalogKeys = new Set(items.map((item) => normalizeCatalogProductUrl(item.url)));

  const res = await fetch("/api/admin/wiki-entities/source-url-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: items.map((i) => i.url) }),
  });
  const json = await parseJsonResponse<{
    success: boolean;
    data: { statuses: SourceUrlStatusRow[] };
    error?: unknown;
  }>(res);
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, "Could not check import status"));
  }

  const next: Record<string, GearImportProcessedEntry> = {};
  const now = Date.now();

  for (const row of json.data.statuses) {
    const key = normalizeCatalogProductUrl(row.url);
    if (!catalogKeys.has(key)) continue;

    if (row.imported && row.entityId) {
      next[key] = {
        sourceUrl: key,
        entityId: row.entityId,
        displayName: row.displayName ?? "Imported gear",
        status: row.status ?? "draft",
        updatedAt: new Date().toISOString(),
      };
      continue;
    }

    const recent = currentProcessed[key];
    if (
      recent?.entityId &&
      now - new Date(recent.updatedAt).getTime() < RECENT_SAVE_GRACE_MS
    ) {
      next[key] = recent;
    }
  }

  return next;
}

export function countImportedCatalogItems(
  items: (WikiCatalogListItem & { importStatus?: GearImportProcessedEntry })[],
): { linkedCards: number; uniqueEntities: number } {
  const entityIds = new Set<string>();
  let linkedCards = 0;

  for (const item of items) {
    if (!item.importStatus?.entityId) continue;
    linkedCards += 1;
    entityIds.add(item.importStatus.entityId);
  }

  return { linkedCards, uniqueEntities: entityIds.size };
}
