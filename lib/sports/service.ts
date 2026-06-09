import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, max, ne, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  DEFAULT_SPORT_MODULES,
  sports,
  type Sport,
  type SportModules,
  type SportVisibility,
} from "@/db/schema/sports";
import { tournaments } from "@/db/schema/tournaments";
import { wikiEntities } from "@/db/schema/wiki";
import { AppError } from "@/lib/errors";
import { deleteStoredObject } from "@/lib/storage/object-lifecycle";
import { slugifyWikiName } from "@/lib/wiki/slug";
import type { AdminSportsListQuery, SportUpsertInput } from "@/lib/validations/sports-admin";

export type SportPublicCard = {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  visibility: SportVisibility;
  modules: SportModules;
  isLive: boolean;
};

export type SportDetail = Sport & {
  modules: SportModules;
};

export type AdminSportsListResult = {
  items: SportDetail[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  orderSnapshot: { id: number; displayOrder: number; name: string }[];
};

function mapSportRow(row: Sport): SportDetail {
  return {
    ...row,
    modules: (row.modules as SportModules | null) ?? DEFAULT_SPORT_MODULES,
  };
}

function sortColumn(sortBy: AdminSportsListQuery["sortBy"]) {
  switch (sortBy) {
    case "name":
      return sports.name;
    case "updated":
      return sports.updatedAt;
    case "displayOrder":
    default:
      return sports.displayOrder;
  }
}

export async function listPublicSports(): Promise<SportPublicCard[]> {
  const rows = await getDb()
    .select()
    .from(sports)
    .where(
      and(
        eq(sports.isActive, true),
        inArray(sports.visibility, ["live", "coming_soon"]),
      ),
    )
    .orderBy(asc(sports.displayOrder), asc(sports.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    description: row.description,
    heroImageUrl: row.heroImageUrl,
    accentColor: row.accentColor,
    visibility: row.visibility as SportVisibility,
    modules: (row.modules as SportModules | null) ?? DEFAULT_SPORT_MODULES,
    isLive: row.visibility === "live",
  }));
}

export async function getSportDetailBySlug(slug: string): Promise<SportDetail | null> {
  const [row] = await getDb()
    .select()
    .from(sports)
    .where(
      and(
        eq(sports.slug, slug),
        eq(sports.isActive, true),
        inArray(sports.visibility, ["live", "coming_soon"]),
      ),
    )
    .limit(1);

  return row ? mapSportRow(row) : null;
}

export async function listAdminSportsPaginated(
  query: AdminSportsListQuery,
): Promise<AdminSportsListResult> {
  const db = getDb();
  const { page, pageSize, search, visibility, status, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(sports.name, term),
        ilike(sports.slug, term),
        ilike(sports.tagline, term),
      )!,
    );
  }
  if (visibility !== "all") {
    conditions.push(eq(sports.visibility, visibility));
  }
  if (status === "active") {
    conditions.push(eq(sports.isActive, true));
  } else if (status === "inactive") {
    conditions.push(eq(sports.isActive, false));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const orderFn = sortDir === "desc" ? desc : asc;

  const [totalRow] = await db.select({ count: count() }).from(sports).where(whereClause);
  const total = Number(totalRow?.count ?? 0);

  const rows = await db
    .select()
    .from(sports)
    .where(whereClause)
    .orderBy(orderFn(sortColumn(sortBy)), asc(sports.id))
    .limit(pageSize)
    .offset(offset);

  const orderSnapshot = await db
    .select({
      id: sports.id,
      displayOrder: sports.displayOrder,
      name: sports.name,
    })
    .from(sports)
    .orderBy(asc(sports.displayOrder), asc(sports.name));

  return {
    items: rows.map(mapSportRow),
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    orderSnapshot,
  };
}

export async function getAdminSportById(id: number): Promise<SportDetail | null> {
  const [row] = await getDb().select().from(sports).where(eq(sports.id, id)).limit(1);
  return row ? mapSportRow(row) : null;
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: number) {
  let slug = baseSlug;
  let n = 0;
  while (true) {
    const [existing] = await getDb()
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, slug))
      .limit(1);
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
}

async function nextDisplayOrder(): Promise<number> {
  const [row] = await getDb().select({ value: max(sports.displayOrder) }).from(sports);
  return Number(row?.value ?? -1) + 1;
}

export async function createSport(
  input: SportUpsertInput,
  media?: { heroImageUrl?: string | null; heroImageStorageKey?: string | null },
): Promise<SportDetail> {
  const db = getDb();
  const baseSlug = input.slug?.trim() || slugifyWikiName(input.name);
  const slug = await ensureUniqueSlug(baseSlug);

  const [nameConflict] = await db
    .select({ id: sports.id })
    .from(sports)
    .where(eq(sports.name, input.name))
    .limit(1);

  if (nameConflict) {
    throw new AppError("A sport with this name already exists", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [created] = await db
    .insert(sports)
    .values({
      name: input.name,
      slug,
      tagline: input.tagline || null,
      description: input.description || null,
      rulesSummary: input.rulesSummary || null,
      rulesContent: input.rulesContent || null,
      howToPlay: input.howToPlay || null,
      equipmentOverview: input.equipmentOverview || null,
      accentColor: input.accentColor || null,
      visibility: input.visibility,
      modules: input.modules,
      isActive: input.isActive,
      displayOrder: await nextDisplayOrder(),
      heroImageUrl: media?.heroImageUrl ?? null,
      heroImageStorageKey: media?.heroImageStorageKey ?? null,
    })
    .returning();

  if (!created) {
    throw new AppError("Failed to create sport", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return mapSportRow(created);
}

export async function updateSport(
  id: number,
  input: SportUpsertInput,
  media?: { heroImageUrl?: string | null; heroImageStorageKey?: string | null },
): Promise<SportDetail> {
  const db = getDb();
  const [existing] = await db.select().from(sports).where(eq(sports.id, id)).limit(1);
  if (!existing) {
    throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const [nameConflict] = await db
    .select({ id: sports.id })
    .from(sports)
    .where(and(eq(sports.name, input.name), ne(sports.id, id)))
    .limit(1);

  if (nameConflict) {
    throw new AppError("A sport with this name already exists", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [updated] = await db
    .update(sports)
    .set({
      name: input.name,
      slug: existing.slug,
      tagline: input.tagline || null,
      description: input.description || null,
      rulesSummary: input.rulesSummary || null,
      rulesContent: input.rulesContent || null,
      howToPlay: input.howToPlay || null,
      equipmentOverview: input.equipmentOverview || null,
      accentColor: input.accentColor || null,
      visibility: input.visibility,
      modules: input.modules,
      isActive: input.isActive,
      heroImageUrl:
        media?.heroImageUrl !== undefined ? media.heroImageUrl : existing.heroImageUrl,
      heroImageStorageKey:
        media?.heroImageStorageKey !== undefined
          ? media.heroImageStorageKey
          : existing.heroImageStorageKey,
      updatedAt: new Date(),
    })
    .where(eq(sports.id, id))
    .returning();

  if (!updated) {
    throw new AppError("Failed to update sport", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return mapSportRow(updated);
}

export async function reorderSports(orderedIds: number[]): Promise<void> {
  const db = getDb();
  const unique = [...new Set(orderedIds)];
  if (unique.length !== orderedIds.length) {
    throw new AppError("Duplicate sport ids in reorder payload", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const rows = await db.select({ id: sports.id }).from(sports);
  if (unique.length !== rows.length) {
    throw new AppError("Reorder payload must include every sport", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await tx
        .update(sports)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(eq(sports.id, orderedIds[i]!));
    }
  });
}

export async function countSports(): Promise<number> {
  const [row] = await getDb().select({ count: count() }).from(sports);
  return Number(row?.count ?? 0);
}

export type SportDeleteBlockers = {
  wikiEntities: number;
  tournaments: number;
};

export async function getSportDeleteBlockers(sportId: number): Promise<SportDeleteBlockers> {
  const db = getDb();
  const [wikiRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .where(eq(wikiEntities.sportId, sportId));
  const [tournamentRow] = await db
    .select({ count: count() })
    .from(tournaments)
    .where(eq(tournaments.sportId, sportId));

  return {
    wikiEntities: Number(wikiRow?.count ?? 0),
    tournaments: Number(tournamentRow?.count ?? 0),
  };
}

export async function deleteSport(id: number): Promise<void> {
  const db = getDb();
  const existing = await getAdminSportById(id);
  if (!existing) {
    throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const blockers = await getSportDeleteBlockers(id);
  if (blockers.wikiEntities > 0 || blockers.tournaments > 0) {
    const parts: string[] = [];
    if (blockers.wikiEntities > 0) {
      parts.push(`${blockers.wikiEntities} wiki entr${blockers.wikiEntities === 1 ? "y" : "ies"}`);
    }
    if (blockers.tournaments > 0) {
      parts.push(
        `${blockers.tournaments} tournament${blockers.tournaments === 1 ? "" : "s"}`,
      );
    }
    throw new AppError(
      `Cannot delete this sport while it still has ${parts.join(" and ")}. Remove dependent data first.`,
      { code: "CONFLICT", statusCode: 409, context: { blockers } },
    );
  }

  await deleteStoredObject(existing.heroImageStorageKey);

  const deleted = await db.delete(sports).where(eq(sports.id, id)).returning({ id: sports.id });
  if (!deleted.length) {
    throw new AppError("Failed to delete sport", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const remaining = await db
    .select({ id: sports.id })
    .from(sports)
    .orderBy(asc(sports.displayOrder), asc(sports.name));

  if (remaining.length > 0) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < remaining.length; i += 1) {
        await tx
          .update(sports)
          .set({ displayOrder: i })
          .where(eq(sports.id, remaining[i]!.id));
      }
    });
  }
}
