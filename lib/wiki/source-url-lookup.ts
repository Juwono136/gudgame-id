import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema/wiki";
import { AppError } from "@/lib/errors";
import { normalizeWikiSourceUrl, wikiSourceUrlLookupCandidates } from "@/lib/wiki/normalize-source-url";

export type WikiSourceUrlStatus = {
  sourceUrl: string;
  entityId: string;
  displayName: string;
  status: string;
  slug: string;
};

/** Resolve imported gear entities by scrape source URL (deduped by normalized URL). */
export async function lookupWikiEntitiesBySourceUrls(
  sportId: string,
  urls: string[],
): Promise<WikiSourceUrlStatus[]> {
  const uniqueKeys = [...new Set(urls.map(normalizeWikiSourceUrl).filter(Boolean))];
  if (uniqueKeys.length === 0) return [];

  const candidates = new Set<string>();
  for (const key of uniqueKeys) {
    for (const candidate of wikiSourceUrlLookupCandidates(key)) {
      candidates.add(candidate);
    }
  }

  const db = getDb();
  const rows = await db
    .select({
      id: wikiEntities.id,
      sourceUrl: wikiEntities.sourceUrl,
      displayName: wikiEntities.displayName,
      status: wikiEntities.status,
      slug: wikiEntities.slug,
    })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "gear"),
        inArray(wikiEntities.sourceUrl, [...candidates]),
      ),
    );

  const byKey = new Map<string, WikiSourceUrlStatus>();
  for (const row of rows) {
    if (!row.sourceUrl) continue;
    const key = normalizeWikiSourceUrl(row.sourceUrl);
    byKey.set(key, {
      sourceUrl: row.sourceUrl,
      entityId: row.id,
      displayName: row.displayName,
      status: row.status,
      slug: row.slug,
    });
  }

  return uniqueKeys
    .map((key) => byKey.get(key))
    .filter((row): row is WikiSourceUrlStatus => row != null);
}

/** Reject duplicate gear imports within the same sport (optional exclude for updates). */
export async function assertGearSourceUrlUnique(
  sportId: string,
  sourceUrl: string | null | undefined,
  excludeEntityId?: string,
): Promise<void> {
  if (!sourceUrl?.trim()) return;

  const matches = await lookupWikiEntitiesBySourceUrls(sportId, [sourceUrl]);
  const conflict = matches.find((row) => row.entityId !== excludeEntityId);
  if (!conflict) return;

  throw new AppError(
    `Gear from this source URL already exists for this sport (${conflict.displayName})`,
    { code: "CONFLICT", statusCode: 409 },
  );
}
