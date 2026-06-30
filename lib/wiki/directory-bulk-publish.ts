import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema/wiki";
import { AppError } from "@/lib/errors";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
import {
  assertAdminCanManageWikiEntity,
  getWikiEntityAdminAccessRow,
} from "@/lib/wiki/admin-entity-access";
import { listWikiDirectory, type WikiDirectoryOptions } from "@/lib/wiki/directory";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";

const BULK_PUBLISH_MAX = 100;

export type BulkPublishSkipped = {
  id: string;
  displayName: string;
  reason: string;
};

export type BulkPublishFailed = {
  id: string;
  displayName: string;
  error: string;
};

export type BulkPublishDirectoryResult = {
  publishedCount: number;
  skipped: BulkPublishSkipped[];
  failed: BulkPublishFailed[];
};

function skipPublishReason(item: WikiDirectoryListItem): string {
  if (item.recordKind === "tournament") {
    return "Tournaments must be published from the tournament editor.";
  }
  if (item.status === "published") {
    return "Already published.";
  }
  if (item.status === "archived") {
    return "Archived entities cannot be bulk-published.";
  }
  if (item.status !== "draft") {
    return "Only draft wiki entities can be published.";
  }
  return "This item cannot be published.";
}

export async function publishWikiEntity(
  id: string,
  sportId: string,
  actorId: string,
): Promise<{ id: string; displayName: string }> {
  const access = await getWikiEntityAdminAccessRow(id);
  if (!access) {
    throw new AppError("Wiki entity not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  assertAdminCanManageWikiEntity(access, actorId, sportId);

  const db = getDb();
  const [existing] = await db
    .select({
      id: wikiEntities.id,
      displayName: wikiEntities.displayName,
      status: wikiEntities.status,
      publishedAt: wikiEntities.publishedAt,
    })
    .from(wikiEntities)
    .where(and(eq(wikiEntities.id, id), eq(wikiEntities.sportId, sportId)))
    .limit(1);

  if (!existing) {
    throw new AppError("Wiki entity not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (existing.status !== "draft") {
    throw new AppError(`"${existing.displayName}" is not a draft`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const now = new Date();
  await db
    .update(wikiEntities)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? now,
      updatedBy: actorId,
      updatedAt: now,
    })
    .where(eq(wikiEntities.id, id));

  return { id: existing.id, displayName: existing.displayName };
}

export async function bulkPublishWikiEntities(input: {
  sportId: string;
  actorId: string;
  wikiEntityIds: string[];
}): Promise<BulkPublishDirectoryResult> {
  const ids = [...new Set(input.wikiEntityIds)].slice(0, BULK_PUBLISH_MAX);

  if (ids.length > BULK_PUBLISH_MAX) {
    throw new AppError(`You can publish up to ${BULK_PUBLISH_MAX} items per request`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (ids.length === 0) {
    throw new AppError("No draft wiki entities selected for publishing", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const result: BulkPublishDirectoryResult = {
    publishedCount: 0,
    skipped: [],
    failed: [],
  };

  for (const id of ids) {
    try {
      await publishWikiEntity(id, input.sportId, input.actorId);
      result.publishedCount += 1;
    } catch (err) {
      result.failed.push({
        id,
        displayName: id,
        error: err instanceof Error ? err.message : "Publish failed",
      });
    }
  }

  return result;
}

export async function bulkPublishDirectoryByFilter(input: {
  sportId: string;
  actorId: string;
  filter: WikiEntitiesListQuery;
  options?: WikiDirectoryOptions;
}): Promise<BulkPublishDirectoryResult & { matched: number }> {
  const listing = await listWikiDirectory(
    input.sportId,
    {
      ...input.filter,
      status: "draft",
      page: 1,
      pageSize: BULK_PUBLISH_MAX,
    },
    input.options,
  );

  const publishable = listing.items.filter(
    (item) => item.recordKind === "wiki_entity" && item.status === "draft",
  );
  const skipped = listing.items
    .filter((item) => item.recordKind !== "wiki_entity" || item.status !== "draft")
    .map((item) => ({
      id: String(item.id),
      displayName: item.displayName,
      reason: skipPublishReason(item),
    }));

  if (publishable.length === 0) {
    return {
      publishedCount: 0,
      skipped,
      failed: [],
      matched: listing.items.length,
    };
  }

  const result = await bulkPublishWikiEntities({
    sportId: input.sportId,
    actorId: input.actorId,
    wikiEntityIds: publishable.map((item) => String(item.id)),
  });

  const failedWithNames = result.failed.map((row) => {
    const match = publishable.find((item) => String(item.id) === row.id);
    return {
      ...row,
      displayName: match?.displayName ?? row.displayName,
    };
  });

  return {
    ...result,
    failed: failedWithNames,
    matched: listing.items.length,
    skipped: [...skipped, ...result.skipped],
  };
}
