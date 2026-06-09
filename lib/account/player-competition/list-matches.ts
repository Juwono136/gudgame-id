import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerMatches, type MatchResultType } from "@/db/schema/player-competition";
import { buildPaginatedResult } from "@/lib/account/player-competition/paginate";
import type {
  PaginatedListResult,
  PlayerMatchListItem,
} from "@/lib/account/player-competition/types";
import type { PlayerMatchesListQuery } from "@/lib/validations/player-competition";

function mapMatchRow(row: typeof playerMatches.$inferSelect): PlayerMatchListItem {
  return {
    id: row.id,
    tournamentName: row.tournamentName,
    opponents: row.opponents,
    resultType: row.resultType as MatchResultType,
    score: row.score,
    round: row.round,
    playedAt: row.playedAt.toISOString(),
  };
}

function matchSortColumn(sortBy: PlayerMatchesListQuery["sortBy"]) {
  return sortBy === "tournament" ? playerMatches.tournamentName : playerMatches.playedAt;
}

export async function listPlayerMatches(
  userId: string,
  query: PlayerMatchesListQuery,
): Promise<PaginatedListResult<PlayerMatchListItem>> {
  const db = getDb();
  const { page, pageSize, search, result, year, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(playerMatches.userId, userId)];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(playerMatches.tournamentName, term),
        ilike(playerMatches.opponents, term),
        ilike(playerMatches.round, term),
      )!,
    );
  }

  if (result && result !== "all") {
    conditions.push(eq(playerMatches.resultType, result));
  }

  if (year != null) {
    conditions.push(
      and(
        gte(playerMatches.playedAt, new Date(`${year}-01-01T00:00:00.000Z`)),
        lte(playerMatches.playedAt, new Date(`${year}-12-31T23:59:59.999Z`)),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(playerMatches)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(playerMatches)
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
