import "server-only";

import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerTournamentResults } from "@/db/schema/player-competition";
import { buildPaginatedResult } from "@/lib/account/player-competition/paginate";
import type {
  PaginatedListResult,
  PlayerTournamentListItem,
} from "@/lib/account/player-competition/types";
import type { PlayerTournamentsListQuery } from "@/lib/validations/player-competition";

function mapTournamentRow(
  row: typeof playerTournamentResults.$inferSelect,
): PlayerTournamentListItem {
  return {
    id: row.id,
    year: row.year,
    tournamentName: row.tournamentName,
    category: row.category,
    placement: row.placement,
    playedAt: row.playedAt?.toISOString() ?? null,
  };
}

function tournamentSortColumn(sortBy: PlayerTournamentsListQuery["sortBy"]) {
  switch (sortBy) {
    case "tournament":
      return playerTournamentResults.tournamentName;
    case "placement":
      return playerTournamentResults.placementRank;
    case "year":
    default:
      return playerTournamentResults.year;
  }
}

export async function listPlayerTournaments(
  userId: string,
  query: PlayerTournamentsListQuery,
): Promise<PaginatedListResult<PlayerTournamentListItem>> {
  const db = getDb();
  const { page, pageSize, search, year, placement, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(playerTournamentResults.userId, userId)];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(playerTournamentResults.tournamentName, term),
        ilike(playerTournamentResults.category, term),
        ilike(playerTournamentResults.placement, term),
      )!,
    );
  }

  if (year != null) {
    conditions.push(eq(playerTournamentResults.year, year));
  }

  if (placement?.trim()) {
    conditions.push(ilike(playerTournamentResults.placement, `%${placement.trim()}%`));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(playerTournamentResults)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(playerTournamentResults)
    .where(whereClause)
    .orderBy(orderFn(tournamentSortColumn(sortBy)), desc(playerTournamentResults.id))
    .limit(pageSize)
    .offset(offset);

  return buildPaginatedResult(
    rows.map(mapTournamentRow),
    total,
    page,
    pageSize,
  );
}

export async function listDistinctTournamentYears(userId: string): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ year: playerTournamentResults.year })
    .from(playerTournamentResults)
    .where(eq(playerTournamentResults.userId, userId))
    .orderBy(desc(playerTournamentResults.year));

  return rows.map((r) => r.year);
}
