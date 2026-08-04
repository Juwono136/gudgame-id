import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerLeagues } from "@/db/schema/partner-leagues";
import { sports } from "@/db/schema/sports";
import { tournaments, type TournamentStatus } from "@/db/schema/tournaments";
import {
  computeTournamentStatus,
  syncTournamentStatusFromSchedule,
} from "@/lib/tournaments/status-sync";
import {
  getPartnerTournamentBySlug,
  type TournamentDetail,
  type TournamentListItem,
} from "@/lib/tournaments/service";
import { isPartnerLeaguePubliclyVisible } from "@/lib/partners/league-types";
import {
  toPartnerPagedResult,
  type PartnerPagedResult,
  type PartnerTournamentsListQuery,
} from "@/lib/partners/list-query";
import { toOffset } from "@/lib/pagination/constants";
import { resolveTournamentCoverUrl } from "@/lib/tournaments/resolve-cover";

function buildTournamentConditions(
  partnerId: string,
  query: Pick<PartnerTournamentsListQuery, "search" | "status" | "leagueId">,
  options?: { sportId?: string; excludeDrafts?: boolean },
): SQL[] {
  const conditions: SQL[] = [eq(tournaments.partnerId, partnerId)];
  if (options?.sportId) conditions.push(eq(tournaments.sportId, options.sportId));

  const search = query.search?.trim();
  if (search) {
    conditions.push(
      or(
        ilike(tournaments.name, `%${search}%`),
        ilike(tournaments.venue, `%${search}%`),
        ilike(tournaments.categoryLabel, `%${search}%`),
        ilike(partnerLeagues.name, `%${search}%`),
      )!,
    );
  }

  const leagueId = query.leagueId?.trim();
  if (leagueId) {
    conditions.push(eq(tournaments.partnerLeagueId, leagueId));
  }

  if (query.status === "active") {
    conditions.push(inArray(tournaments.status, ["live", "upcoming"]));
  } else if (query.status && query.status !== "all") {
    conditions.push(eq(tournaments.status, query.status));
  } else if (options?.excludeDrafts) {
    conditions.push(
      inArray(tournaments.status, ["live", "upcoming", "completed", "cancelled"]),
    );
  }

  return conditions;
}

function tournamentOrderBy(query: PartnerTournamentsListQuery) {
  const dir = query.sortDir === "asc" ? asc : desc;
  if (query.sortBy === "name") return dir(tournaments.name);
  if (query.sortBy === "startsAt") return dir(tournaments.startsAt);
  return dir(tournaments.updatedAt);
}

function mapTournamentRow(row: {
  id: string;
  sportId: string;
  sportSlug: string;
  sportName: string;
  slug: string;
  name: string;
  summary: string | null;
  description?: string | null;
  status: string;
  tournamentType: string;
  format?: string | null;
  officialBilling: string | null;
  venue: string | null;
  categoryLabel: string | null;
  registrationFeeIdr: number | null;
  prizePoolIdr?: number | null;
  coverImageUrl?: string | null;
  coverImageStorageKey?: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  updatedAt: Date;
  partnerLeagueId?: string | null;
  partnerLeagueName?: string | null;
  partnerLeagueSlug?: string | null;
  partnerLeagueStatus?: string | null;
}): TournamentListItem {
  const status = computeTournamentStatus(
    row.status as TournamentStatus,
    row.startsAt,
    row.endsAt,
  );
  const hideLeagueSlug =
    row.partnerLeagueStatus != null &&
    !isPartnerLeaguePubliclyVisible(row.partnerLeagueStatus);
  return {
    id: row.id,
    sportId: row.sportId,
    sportSlug: row.sportSlug,
    sportName: row.sportName,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description ?? null,
    status,
    tournamentType: row.tournamentType,
    format: row.format ?? null,
    officialBilling: (row.officialBilling as TournamentListItem["officialBilling"]) ?? null,
    venue: row.venue,
    categoryLabel: row.categoryLabel,
    registrationFeeIdr: row.registrationFeeIdr,
    prizePoolIdr: row.prizePoolIdr ?? null,
    coverImageUrl: resolveTournamentCoverUrl(
      row.coverImageUrl ?? null,
      row.coverImageStorageKey ?? null,
    ),
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    partnerLeagueId: row.partnerLeagueId ?? null,
    partnerLeagueName: row.partnerLeagueName ?? null,
    // Hide slug when league is draft/archived so badges do not 404.
    partnerLeagueSlug: hideLeagueSlug ? null : (row.partnerLeagueSlug ?? null),
    partnerLeagueStatus: row.partnerLeagueStatus ?? null,
  };
}

/** Paginated partner tournament directory (dashboard + public). */
export async function queryPartnerTournaments(
  partnerId: string,
  query: PartnerTournamentsListQuery,
  options?: { sportId?: string; excludeDrafts?: boolean },
): Promise<PartnerPagedResult<TournamentListItem>> {
  const db = getDb();
  const conditions = buildTournamentConditions(partnerId, query, options);
  const where = and(...conditions);
  const offset = toOffset(query.page, query.pageSize);

  const [totalRow] = await db
    .select({ value: count() })
    .from(tournaments)
    .leftJoin(partnerLeagues, eq(tournaments.partnerLeagueId, partnerLeagues.id))
    .where(where);

  const total = Number(totalRow?.value ?? 0);
  if (total === 0) {
    return toPartnerPagedResult([], 0, query.page, query.pageSize);
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
      description: tournaments.description,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      format: tournaments.format,
      officialBilling: tournaments.officialBilling,
      venue: tournaments.venue,
      categoryLabel: tournaments.categoryLabel,
      registrationFeeIdr: tournaments.registrationFeeIdr,
      prizePoolIdr: tournaments.prizePoolIdr,
      coverImageUrl: tournaments.coverImageUrl,
      coverImageStorageKey: tournaments.coverImageStorageKey,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
      partnerLeagueId: tournaments.partnerLeagueId,
      partnerLeagueName: partnerLeagues.name,
      partnerLeagueSlug: partnerLeagues.slug,
      partnerLeagueStatus: partnerLeagues.status,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(partnerLeagues, eq(tournaments.partnerLeagueId, partnerLeagues.id))
    .where(where)
    .orderBy(tournamentOrderBy(query))
    .limit(query.pageSize)
    .offset(offset);

  await Promise.all(
    rows.map((r) =>
      syncTournamentStatusFromSchedule({
        id: r.id,
        sportSlug: r.sportSlug,
        slug: r.slug,
        status: r.status,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
      }),
    ),
  );

  return toPartnerPagedResult(
    rows.map(mapTournamentRow),
    total,
    query.page,
    query.pageSize,
  );
}

/**
 * Backward-compatible full-ish list (capped) for teasers / slug checks.
 * Prefer `queryPartnerTournaments` for directory UIs.
 */
export async function listPartnerTournaments(
  partnerId: string,
  sportId?: string,
): Promise<TournamentListItem[]> {
  const result = await queryPartnerTournaments(
    partnerId,
    {
      page: 1,
      pageSize: 50,
      status: "all",
      sortBy: "updatedAt",
      sortDir: "desc",
    },
    { sportId },
  );
  return result.items;
}

/** Compact teaser query for landing / dashboard cards. */
export async function listPartnerTournamentTeasers(
  partnerId: string,
  options?: { limit?: number; status?: PartnerTournamentsListQuery["status"] },
): Promise<TournamentListItem[]> {
  const result = await queryPartnerTournaments(partnerId, {
    page: 1,
    pageSize: Math.min(Math.max(options?.limit ?? 6, 1), 20),
    status: options?.status ?? "active",
    sortBy: "startsAt",
    sortDir: "asc",
  });
  return result.items;
}

/** Tournaments linked to a partner league (public or dashboard). */
export async function listPartnerTournamentsForLeague(
  partnerId: string,
  leagueId: string,
  options?: { excludeDrafts?: boolean; limit?: number; page?: number },
): Promise<TournamentListItem[]> {
  const result = await queryPartnerTournamentsForLeague(partnerId, leagueId, options);
  return result.items;
}

/** Paginated tournaments for a league detail page. */
export async function queryPartnerTournamentsForLeague(
  partnerId: string,
  leagueId: string,
  options?: {
    excludeDrafts?: boolean;
    limit?: number;
    page?: number;
  },
): Promise<PartnerPagedResult<TournamentListItem>> {
  return queryPartnerTournaments(
    partnerId,
    {
      page: Math.max(options?.page ?? 1, 1),
      pageSize: Math.min(Math.max(options?.limit ?? 20, 1), 50),
      status: "all",
      leagueId,
      sortBy: "startsAt",
      sortDir: "asc",
    },
    { excludeDrafts: options?.excludeDrafts },
  );
}

/**
 * Resolve sportSlug for a partner tournament by URL slug (no 50-item list scan).
 */
export async function resolvePartnerTournamentSportSlug(
  partnerId: string,
  slug: string,
): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ sportSlug: sports.slug })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(eq(tournaments.partnerId, partnerId), eq(tournaments.slug, slug)))
    .limit(1);
  return row?.sportSlug ?? null;
}

/**
 * Public-facing tournament detail lookup by slug only (no sportSlug segment in the URL).
 */
export async function getPartnerTournamentDetailBySlug(
  partnerId: string,
  slug: string,
): Promise<TournamentDetail | null> {
  const sportSlug = await resolvePartnerTournamentSportSlug(partnerId, slug);
  if (!sportSlug) return null;
  return getPartnerTournamentBySlug(partnerId, sportSlug, slug);
}

export async function countPartnerTournaments(
  partnerId: string,
  status: PartnerTournamentsListQuery["status"] = "all",
  options?: { excludeDrafts?: boolean },
): Promise<number> {
  const result = await queryPartnerTournaments(
    partnerId,
    {
      page: 1,
      pageSize: 5,
      status,
      sortBy: "updatedAt",
      sortDir: "desc",
    },
    options,
  );
  return result.total;
}
