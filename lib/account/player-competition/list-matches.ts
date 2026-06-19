import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerMatches, type MatchResultType } from "@/db/schema/player-competition";
import { sports } from "@/db/schema/sports";
import { tournaments } from "@/db/schema/tournaments";
import { buildPaginatedResult } from "@/lib/account/player-competition/paginate";
import type {
  PaginatedListResult,
  PlayerMatchListItem,
} from "@/lib/account/player-competition/types";
import type { PlayerMatchesListQuery } from "@/lib/validations/player-competition";

export type PlayerMatchListSummary = {
  total: number;
  wins: number;
  losses: number;
  official: number;
  reclub: number;
};

type MatchListRow = {
  id: number; tournamentId: string | null;
  tournamentName: string;
  opponents: string;
  resultType: string;
  score: string | null;
  round: string | null;
  playedAt: Date;
  isOfficial: boolean;
  sportName: string | null;
  sportSlug: string | null;
  tournamentSlug: string | null;
  venue: string | null;
  tournamentType: string | null;
};

function mapMatchRow(row: MatchListRow): PlayerMatchListItem {
  const isOfficial = row.isOfficial;
  const tournamentType =
    row.tournamentType === "official" || row.tournamentType === "recreational"
      ? row.tournamentType
      : isOfficial
        ? "official"
        : "recreational";

  return {
    id: row.id,
    tournamentId: row.tournamentId,
    tournamentName: row.tournamentName,
    opponents: row.opponents,
    resultType: row.resultType as MatchResultType,
    score: row.score,
    round: row.round,
    playedAt: row.playedAt.toISOString(),
    isOfficial,
    tournamentType,
    sportName: row.sportName,
    sportSlug: row.sportSlug,
    tournamentSlug: row.tournamentSlug,
    venue: row.venue,
  };
}

function matchSortColumn(sortBy: PlayerMatchesListQuery["sortBy"]) {
  return sortBy === "tournament" ? playerMatches.tournamentName : playerMatches.playedAt;
}

function buildMatchConditions(userId: string, query: PlayerMatchesListQuery) {
  const { search, result, type, year } = query;
  const conditions = [eq(playerMatches.userId, userId)];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(playerMatches.tournamentName, term),
        ilike(playerMatches.opponents, term),
        ilike(playerMatches.round, term),
        ilike(sports.name, term),
        ilike(tournaments.venue, term),
      )!,
    );
  }

  if (result && result !== "all") {
    conditions.push(eq(playerMatches.resultType, result));
  }

  if (type === "official") {
    conditions.push(eq(playerMatches.isOfficial, true));
  } else if (type === "recreational") {
    conditions.push(eq(playerMatches.isOfficial, false));
  }

  if (year != null) {
    conditions.push(
      and(
        gte(playerMatches.playedAt, new Date(`${year}-01-01T00:00:00.000Z`)),
        lte(playerMatches.playedAt, new Date(`${year}-12-31T23:59:59.999Z`)),
      )!,
    );
  }

  return and(...conditions);
}

function matchListSelect() {
  return {
    id: playerMatches.id,
    tournamentId: playerMatches.tournamentId,
    tournamentName: playerMatches.tournamentName,
    opponents: playerMatches.opponents,
    resultType: playerMatches.resultType,
    score: playerMatches.score,
    round: playerMatches.round,
    playedAt: playerMatches.playedAt,
    isOfficial: playerMatches.isOfficial,
    sportName: sports.name,
    sportSlug: sports.slug,
    tournamentSlug: tournaments.slug,
    venue: tournaments.venue,
    tournamentType: tournaments.tournamentType,
  };
}

export async function getPlayerMatchListSummary(
  userId: string,
  query: Pick<PlayerMatchesListQuery, "search" | "result" | "type" | "year">,
): Promise<PlayerMatchListSummary> {
  const db = getDb();
  const whereClause = buildMatchConditions(userId, {
    ...query,
    page: 1,
    pageSize: 10,
    sortBy: "playedAt",
    sortDir: "desc",
  });

  const [row] = await db
    .select({
      total: count(),
      wins: sql<number>`count(*) filter (where ${playerMatches.resultType} = 'win')`,
      losses: sql<number>`count(*) filter (where ${playerMatches.resultType} = 'loss')`,
      official: sql<number>`count(*) filter (where ${playerMatches.isOfficial} = true)`,
      reclub: sql<number>`count(*) filter (where ${playerMatches.isOfficial} = false)`,
    })
    .from(playerMatches)
    .leftJoin(tournaments, eq(playerMatches.tournamentId, tournaments.id))
    .leftJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause);

  return {
    total: Number(row?.total ?? 0),
    wins: Number(row?.wins ?? 0),
    losses: Number(row?.losses ?? 0),
    official: Number(row?.official ?? 0),
    reclub: Number(row?.reclub ?? 0),
  };
}

export async function listPlayerMatches(
  userId: string,
  query: PlayerMatchesListQuery,
): Promise<PaginatedListResult<PlayerMatchListItem>> {
  const db = getDb();
  const { page, pageSize, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;
  const whereClause = buildMatchConditions(userId, query);

  const [totalRow] = await db
    .select({ count: count() })
    .from(playerMatches)
    .leftJoin(tournaments, eq(playerMatches.tournamentId, tournaments.id))
    .leftJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select(matchListSelect())
    .from(playerMatches)
    .leftJoin(tournaments, eq(playerMatches.tournamentId, tournaments.id))
    .leftJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderFn(matchSortColumn(sortBy)), desc(playerMatches.id))
    .limit(pageSize)
    .offset(offset);

  return buildPaginatedResult(
    rows.map(mapMatchRow),
    total,
    page,
    pageSize,
  );
}

export async function listDistinctMatchYears(userId: string): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .select({
      year: sql<number>`extract(year from ${playerMatches.playedAt})::int`,
    })
    .from(playerMatches)
    .where(eq(playerMatches.userId, userId))
    .groupBy(sql`extract(year from ${playerMatches.playedAt})`)
    .orderBy(desc(sql`extract(year from ${playerMatches.playedAt})`));

  return rows.map((r) => r.year).filter((y) => Number.isFinite(y));
}
