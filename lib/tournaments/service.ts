import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import {
  tournaments,
  type TournamentStatus,
  type TournamentType,
} from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { slugifyWikiName } from "@/lib/wiki/slug";
import type {
  TournamentUpsertInput,
  TournamentsListQuery,
} from "@/lib/validations/tournaments";

export type TournamentListItem = {
  id: number;
  sportId: number;
  sportSlug: string;
  sportName: string;
  slug: string;
  name: string;
  summary: string | null;
  status: TournamentStatus;
  tournamentType: TournamentType;
  venue: string | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

export type TournamentDetail = TournamentListItem & {
  description: string | null;
  rules: string | null;
  coverImageUrl: string | null;
  settings: Record<string, unknown>;
};

export type TournamentsListResult = {
  items: TournamentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function mapListRow(row: {
  id: number;
  sportId: number;
  sportSlug: string;
  sportName: string;
  slug: string;
  name: string;
  summary: string | null;
  status: string;
  tournamentType: string;
  venue: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  updatedAt: Date;
}): TournamentListItem {
  return {
    id: row.id,
    sportId: row.sportId,
    sportSlug: row.sportSlug,
    sportName: row.sportName,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    status: row.status as TournamentStatus,
    tournamentType: row.tournamentType as TournamentType,
    venue: row.venue,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sortColumn(sortBy: TournamentsListQuery["sortBy"]) {
  switch (sortBy) {
    case "name":
      return tournaments.name;
    case "updated":
      return tournaments.updatedAt;
    case "startsAt":
    default:
      return tournaments.startsAt;
  }
}

export async function listTournaments(
  sportId: number,
  query: TournamentsListQuery,
): Promise<TournamentsListResult> {
  const db = getDb();
  const { page, pageSize, search, status, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(tournaments.sportId, sportId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(tournaments.name, term),
        ilike(tournaments.summary, term),
        ilike(tournaments.venue, term),
      )!,
    );
  }
  if (status !== "all") {
    conditions.push(eq(tournaments.status, status));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(tournaments)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: tournaments.id,
      sportId: tournaments.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: tournaments.slug,
      name: tournaments.name,
      summary: tournaments.summary,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      venue: tournaments.venue,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn(sortBy)), desc(tournaments.id))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map(mapListRow),
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export async function listPublicTournamentsBySport(
  sportSlug: string,
  bucket: "upcoming" | "live" | "past",
  limit = 12,
): Promise<TournamentListItem[]> {
  const db = getDb();

  const conditions = [eq(sports.slug, sportSlug), eq(sports.isActive, true)];

  if (bucket === "live") {
    conditions.push(eq(tournaments.status, "live"));
  } else if (bucket === "upcoming") {
    conditions.push(eq(tournaments.status, "upcoming"));
  } else {
    conditions.push(
      or(eq(tournaments.status, "completed"), eq(tournaments.status, "cancelled"))!,
    );
  }

  const rows = await db
    .select({
      id: tournaments.id,
      sportId: tournaments.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: tournaments.slug,
      name: tournaments.name,
      summary: tournaments.summary,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      venue: tournaments.venue,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(...conditions))
    .orderBy(desc(tournaments.startsAt))
    .limit(limit);

  return rows.map(mapListRow);
}

export async function getTournamentBySlug(
  sportSlug: string,
  slug: string,
): Promise<TournamentDetail | null> {
  const [row] = await getDb()
    .select({
      id: tournaments.id,
      sportId: tournaments.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: tournaments.slug,
      name: tournaments.name,
      summary: tournaments.summary,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      venue: tournaments.venue,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
      description: tournaments.description,
      rules: tournaments.rules,
      coverImageUrl: tournaments.coverImageUrl,
      settings: tournaments.settings,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(eq(sports.slug, sportSlug), eq(tournaments.slug, slug)))
    .limit(1);

  if (!row) return null;

  return {
    ...mapListRow(row),
    description: row.description,
    rules: row.rules,
    coverImageUrl: row.coverImageUrl,
    settings: (row.settings as Record<string, unknown>) ?? {},
  };
}

async function ensureUniqueSlug(sportId: number, baseSlug: string, excludeId?: number) {
  let slug = baseSlug;
  let n = 0;
  while (true) {
    const [existing] = await getDb()
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(and(eq(tournaments.sportId, sportId), eq(tournaments.slug, slug)))
      .limit(1);
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
}

function parseOptionalDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createTournament(
  sportId: number,
  userId: string,
  input: TournamentUpsertInput,
): Promise<TournamentDetail> {
  const baseSlug = input.slug?.trim() || slugifyWikiName(input.name);
  const slug = await ensureUniqueSlug(sportId, baseSlug);

  const [created] = await getDb()
    .insert(tournaments)
    .values({
      sportId,
      slug,
      name: input.name,
      summary: input.summary || null,
      description: input.description || null,
      status: input.status,
      tournamentType: input.tournamentType,
      rules: input.rules || null,
      venue: input.venue || null,
      startsAt: parseOptionalDate(input.startsAt),
      endsAt: parseOptionalDate(input.endsAt),
      createdBy: userId,
    })
    .returning();

  if (!created) {
    throw new AppError("Failed to create tournament", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  const detail = await getTournamentBySlug(
    (
      await getDb().select({ slug: sports.slug }).from(sports).where(eq(sports.id, sportId)).limit(1)
    )[0]!.slug,
    created.slug,
  );

  if (!detail) {
    throw new AppError("Tournament created but not found", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  return detail;
}

export async function getTournamentStats(sportId: number) {
  const rows = await getDb()
    .select({
      status: tournaments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tournaments)
    .where(eq(tournaments.sportId, sportId))
    .groupBy(tournaments.status);

  const totals = {
    total: 0,
    upcoming: 0,
    live: 0,
    completed: 0,
    draft: 0,
  };

  for (const row of rows) {
    const n = Number(row.count);
    totals.total += n;
    if (row.status === "upcoming") totals.upcoming += n;
    if (row.status === "live") totals.live += n;
    if (row.status === "completed") totals.completed += n;
    if (row.status === "draft") totals.draft += n;
  }

  return totals;
}

export async function countTournamentsForSport(sportId: number): Promise<number> {
  const [row] = await getDb()
    .select({ count: count() })
    .from(tournaments)
    .where(eq(tournaments.sportId, sportId));
  return Number(row?.count ?? 0);
}
