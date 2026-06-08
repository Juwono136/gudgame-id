import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  sports,
  wikiEntities,
  wikiEntityMedia,
  wikiEntityRelations,
  type WikiEntity,
  type WikiEntityStatus,
  type WikiEntityType,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { slugifyWikiName, ensureUniqueWikiSlug } from "@/lib/wiki/slug";
import type {
  WikiEntitiesListQuery,
  WikiEntityUpsertInput,
} from "@/lib/validations/wiki-entities";

export type WikiEntityListItem = {
  id: number;
  sportId: number;
  sportSlug: string;
  sportName: string;
  entityType: WikiEntityType;
  slug: string;
  displayName: string;
  nickname: string | null;
  summary: string | null;
  status: WikiEntityStatus;
  primaryImageUrl: string | null;
  sourceType: string;
  updatedAt: string;
  createdAt: string;
};

export type WikiEntityRelationView = {
  id: number;
  relationType: string;
  metadata: Record<string, unknown>;
  sortOrder: number;
  entity: {
    id: number;
    entityType: WikiEntityType;
    slug: string;
    displayName: string;
    primaryImageUrl: string | null;
  };
};

export type WikiEntityDetail = WikiEntityListItem & {
  biography: string | null;
  heroImageUrl: string | null;
  attributes: Record<string, unknown>;
  performance: Record<string, unknown>;
  specs: Record<string, unknown>;
  features: { title: string; description: string; icon?: string }[];
  sourceUrl: string | null;
  publishedAt: string | null;
  gallery: { id: number; url: string | null; caption: string | null; sortOrder: number }[];
  relations: WikiEntityRelationView[];
};

function mapEntityRow(
  row: WikiEntity & { sportSlug: string; sportName: string },
): WikiEntityListItem {
  return {
    id: row.id,
    sportId: row.sportId,
    sportSlug: row.sportSlug,
    sportName: row.sportName,
    entityType: row.entityType as WikiEntityType,
    slug: row.slug,
    displayName: row.displayName,
    nickname: row.nickname,
    summary: row.summary,
    status: row.status as WikiEntityStatus,
    primaryImageUrl: row.primaryImageUrl,
    sourceType: row.sourceType,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listWikiEntities(
  sportId: number,
  query: WikiEntitiesListQuery,
) {
  const db = getDb();
  const conditions = [eq(wikiEntities.sportId, sportId)];

  if (query.entityType) {
    conditions.push(eq(wikiEntities.entityType, query.entityType));
  }
  if (query.status !== "all") {
    conditions.push(eq(wikiEntities.status, query.status));
  }
  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    conditions.push(
      or(
        ilike(wikiEntities.displayName, term),
        ilike(wikiEntities.nickname, term),
        ilike(wikiEntities.slug, term),
      )!,
    );
  }

  const where = and(...conditions);
  const orderCol =
    query.sortBy === "name"
      ? wikiEntities.displayName
      : query.sortBy === "created"
        ? wikiEntities.createdAt
        : wikiEntities.updatedAt;
  const orderFn = query.sortDir === "asc" ? asc : desc;

  const [totalRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .where(where);

  const offset = (query.page - 1) * query.pageSize;
  const rows = await db
    .select({
      entity: wikiEntities,
      sportSlug: sports.slug,
      sportName: sports.name,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(where)
    .orderBy(orderFn(orderCol))
    .limit(query.pageSize)
    .offset(offset);

  return {
    items: rows.map((r) => mapEntityRow({ ...r.entity, sportSlug: r.sportSlug, sportName: r.sportName })),
    total: Number(totalRow?.count ?? 0),
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getWikiEntityStats(sportId: number) {
  const db = getDb();
  const rows = await db
    .select({
      entityType: wikiEntities.entityType,
      status: wikiEntities.status,
      count: count(),
    })
    .from(wikiEntities)
    .where(eq(wikiEntities.sportId, sportId))
    .groupBy(wikiEntities.entityType, wikiEntities.status);

  const totals = { player: 0, team: 0, gear: 0, published: 0, draft: 0 };
  for (const r of rows) {
    const n = Number(r.count);
    if (r.entityType === "player") totals.player += n;
    if (r.entityType === "team") totals.team += n;
    if (r.entityType === "gear") totals.gear += n;
    if (r.status === "published") totals.published += n;
    if (r.status === "draft") totals.draft += n;
  }
  return totals;
}

async function loadRelations(entityId: number): Promise<WikiEntityRelationView[]> {
  const db = getDb();
  const links = await db
    .select()
    .from(wikiEntityRelations)
    .where(eq(wikiEntityRelations.fromEntityId, entityId))
    .orderBy(asc(wikiEntityRelations.sortOrder));

  if (links.length === 0) return [];

  const targetIds = links.map((l) => l.toEntityId);
  const targets = await db
    .select()
    .from(wikiEntities)
    .where(inArray(wikiEntities.id, targetIds));

  const byId = new Map(targets.map((t) => [t.id, t]));

  return links
    .map((link) => {
      const target = byId.get(link.toEntityId);
      if (!target) return null;
      return {
        id: link.id,
        relationType: link.relationType,
        metadata: (link.metadata ?? {}) as Record<string, unknown>,
        sortOrder: link.sortOrder,
        entity: {
          id: target.id,
          entityType: target.entityType as WikiEntityType,
          slug: target.slug,
          displayName: target.displayName,
          primaryImageUrl: target.primaryImageUrl,
        },
      };
    })
    .filter((x): x is WikiEntityRelationView => x !== null);
}

export async function getWikiEntityById(
  id: number,
  options?: { publishedOnly?: boolean },
): Promise<WikiEntityDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      entity: wikiEntities,
      sportSlug: sports.slug,
      sportName: sports.name,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(eq(wikiEntities.id, id))
    .limit(1);

  if (!row) return null;
  if (options?.publishedOnly && row.entity.status !== "published") return null;

  const media = await db
    .select()
    .from(wikiEntityMedia)
    .where(eq(wikiEntityMedia.entityId, id))
    .orderBy(asc(wikiEntityMedia.sortOrder));

  const relations = await loadRelations(id);

  const base = mapEntityRow({
    ...row.entity,
    sportSlug: row.sportSlug,
    sportName: row.sportName,
  });

  return {
    ...base,
    biography: row.entity.biography,
    heroImageUrl: row.entity.heroImageUrl,
    attributes: (row.entity.attributes ?? {}) as Record<string, unknown>,
    performance: (row.entity.performance ?? {}) as Record<string, unknown>,
    specs: (row.entity.specs ?? {}) as Record<string, unknown>,
    features: (row.entity.features ?? []) as WikiEntityDetail["features"],
    sourceUrl: row.entity.sourceUrl,
    publishedAt: row.entity.publishedAt?.toISOString() ?? null,
    gallery: media.map((m) => ({
      id: m.id,
      url: m.url,
      caption: m.caption,
      sortOrder: m.sortOrder,
    })),
    relations,
  };
}

export async function getPublishedWikiEntityBySlug(
  sportSlug: string,
  entityType: WikiEntityType,
  slug: string,
): Promise<WikiEntityDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: wikiEntities.id })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(
      and(
        eq(sports.slug, sportSlug),
        eq(wikiEntities.entityType, entityType),
        eq(wikiEntities.slug, slug),
        eq(wikiEntities.status, "published"),
      ),
    )
    .limit(1);

  if (!row) return null;
  return getWikiEntityById(row.id, { publishedOnly: true });
}

export async function createWikiEntity(
  sportId: number,
  input: WikiEntityUpsertInput,
  actorId: string,
  images?: {
    heroStorageKey?: string;
    heroUrl?: string;
    primaryStorageKey?: string;
    primaryUrl?: string;
  },
) {
  const db = getDb();
  const baseSlug = input.slug?.trim() || slugifyWikiName(input.displayName);
  const slug = await ensureUniqueWikiSlug(baseSlug, async (s) => {
    const [existing] = await db
      .select({ id: wikiEntities.id })
      .from(wikiEntities)
      .where(and(eq(wikiEntities.sportId, sportId), eq(wikiEntities.slug, s)))
      .limit(1);
    return Boolean(existing);
  });

  const now = new Date();
  const publishedAt = input.status === "published" ? now : null;

  const [created] = await db
    .insert(wikiEntities)
    .values({
      sportId,
      entityType: input.entityType,
      slug,
      displayName: input.displayName,
      nickname: input.nickname || null,
      summary: input.summary || null,
      biography: input.biography || null,
      status: input.status,
      attributes: input.attributes,
      performance: input.performance,
      specs: input.specs,
      features: input.features,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl || null,
      scrapedAt: input.sourceType === "scraped" ? now : null,
      publishedAt,
      heroImageUrl: images?.heroUrl || input.heroImageUrl || null,
      heroImageStorageKey: images?.heroStorageKey ?? null,
      primaryImageUrl: images?.primaryUrl || input.primaryImageUrl || null,
      primaryImageStorageKey: images?.primaryStorageKey ?? null,
      createdBy: actorId,
      updatedBy: actorId,
    })
    .returning();

  if (!created) {
    throw new AppError("Failed to create wiki entity", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  await syncWikiRelations(created.id, input.relations);
  await syncWikiGallery(created.id, input.gallery);

  const detail = await getWikiEntityById(created.id);
  if (!detail) {
    throw new AppError("Entity not found after create", { code: "NOT_FOUND", statusCode: 404 });
  }
  return detail;
}

export async function updateWikiEntity(
  id: number,
  sportId: number,
  input: WikiEntityUpsertInput,
  actorId: string,
  images?: {
    heroStorageKey?: string;
    heroUrl?: string;
    primaryStorageKey?: string;
    primaryUrl?: string;
  },
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(wikiEntities)
    .where(and(eq(wikiEntities.id, id), eq(wikiEntities.sportId, sportId)))
    .limit(1);

  if (!existing) {
    throw new AppError("Wiki entity not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    slug = await ensureUniqueWikiSlug(input.slug, async (s) => {
      const [row] = await db
        .select({ id: wikiEntities.id })
        .from(wikiEntities)
        .where(
          and(
            eq(wikiEntities.sportId, sportId),
            eq(wikiEntities.slug, s),
            ne(wikiEntities.id, id),
          ),
        )
        .limit(1);
      return Boolean(row);
    });
  }

  const publishedAt =
    input.status === "published"
      ? existing.publishedAt ?? new Date()
      : input.status === "draft"
        ? null
        : existing.publishedAt;

  await db
    .update(wikiEntities)
    .set({
      entityType: input.entityType,
      slug,
      displayName: input.displayName,
      nickname: input.nickname || null,
      summary: input.summary || null,
      biography: input.biography || null,
      status: input.status,
      attributes: input.attributes,
      performance: input.performance,
      specs: input.specs,
      features: input.features,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl || null,
      publishedAt,
      heroImageUrl: images?.heroUrl ?? input.heroImageUrl ?? existing.heroImageUrl,
      heroImageStorageKey: images?.heroStorageKey ?? existing.heroImageStorageKey,
      primaryImageUrl:
        images?.primaryUrl ?? input.primaryImageUrl ?? existing.primaryImageUrl,
      primaryImageStorageKey:
        images?.primaryStorageKey ?? existing.primaryImageStorageKey,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(wikiEntities.id, id));

  await syncWikiRelations(id, input.relations);
  await syncWikiGallery(id, input.gallery);

  const detail = await getWikiEntityById(id);
  if (!detail) {
    throw new AppError("Entity not found after update", { code: "NOT_FOUND", statusCode: 404 });
  }
  return detail;
}

async function syncWikiRelations(
  entityId: number,
  relations: WikiEntityUpsertInput["relations"],
) {
  const db = getDb();
  await db.delete(wikiEntityRelations).where(eq(wikiEntityRelations.fromEntityId, entityId));
  if (relations.length === 0) return;

  await db.insert(wikiEntityRelations).values(
    relations.map((r, i) => ({
      fromEntityId: entityId,
      toEntityId: r.toEntityId,
      relationType: r.relationType,
      metadata: r.metadata ?? {},
      sortOrder: r.sortOrder ?? i,
    })),
  );
}

async function syncWikiGallery(
  entityId: number,
  gallery: WikiEntityUpsertInput["gallery"],
) {
  const db = getDb();
  await db.delete(wikiEntityMedia).where(eq(wikiEntityMedia.entityId, entityId));
  const items = gallery.filter((g) => g.url || g.storageKey);
  if (items.length === 0) return;

  await db.insert(wikiEntityMedia).values(
    items.map((g, i) => ({
      entityId,
      url: g.url ?? null,
      storageKey: g.storageKey ?? null,
      caption: g.caption ?? null,
      sortOrder: g.sortOrder ?? i,
      mediaType: "image",
    })),
  );
}

export async function deleteWikiEntity(id: number, sportId: number) {
  const db = getDb();
  const [existing] = await db
    .select({ id: wikiEntities.id })
    .from(wikiEntities)
    .where(and(eq(wikiEntities.id, id), eq(wikiEntities.sportId, sportId)))
    .limit(1);

  if (!existing) {
    throw new AppError("Wiki entity not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  await db.delete(wikiEntities).where(eq(wikiEntities.id, id));
}

export async function searchWikiEntitiesForLink(
  sportId: number,
  entityTypes: WikiEntityType[],
  search: string,
  limit = 10,
) {
  const db = getDb();
  const term = `%${search.trim()}%`;
  return db
    .select({
      id: wikiEntities.id,
      entityType: wikiEntities.entityType,
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      primaryImageUrl: wikiEntities.primaryImageUrl,
    })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.sportId, sportId),
        inArray(wikiEntities.entityType, entityTypes),
        or(
          ilike(wikiEntities.displayName, term),
          ilike(wikiEntities.nickname, term),
        )!,
      ),
    )
    .orderBy(asc(wikiEntities.displayName))
    .limit(limit);
}
