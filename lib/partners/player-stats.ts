import "server-only";

import { and, asc, count, desc, eq, ilike, isNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerPlayerMatches,
  partnerPlayerTournamentResults,
  partnerPlayers,
} from "@/db/schema/partner-players";
import { AppError } from "@/lib/errors";
import {
  toPartnerPagedResult,
  type PartnerPagedResult,
  type PartnerPlayersListQuery,
} from "@/lib/partners/list-query";
import { toOffset } from "@/lib/pagination/constants";
import { rebuildPartnerPlayerStatsFromCompletedMatches } from "@/lib/partners/stats/sync";

export type PartnerPlayerListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  /** Partner guests have no avatar yet — UI uses initials. */
  avatarUrl: string | null;
  wins: number;
  losses: number;
  matchesPlayed: number;
  /** 0–100, null when no decided matches. */
  winRate: number | null;
  lastPlayedAt: string | null;
};

export type PartnerPlayerMatchItem = {
  id: string;
  tournamentId: string | null;
  tournamentName: string;
  opponents: string;
  resultType: "win" | "loss";
  score: string | null;
  round: string | null;
  playedAt: string;
};

export type PartnerPlayerTournamentResultItem = {
  id: string;
  tournamentId: string | null;
  tournamentName: string;
  category: string | null;
  placement: string;
  placementRank: number | null;
  year: number;
  playedAt: string | null;
};

export type PartnerPlayerDetail = PartnerPlayerListItem & {
  matches: PartnerPlayerMatchItem[];
  tournamentResults: PartnerPlayerTournamentResultItem[];
};

function winRateFromCounts(wins: number, losses: number): number | null {
  const decided = wins + losses;
  if (decided <= 0) return null;
  return Math.round((wins / decided) * 1000) / 10;
}

function statsSelect() {
  return {
    id: partnerPlayers.id,
    fullName: partnerPlayers.fullName,
    email: partnerPlayers.email,
    phone: partnerPlayers.phone,
    wins: sql<number>`coalesce(sum(case when ${partnerPlayerMatches.resultType} = 'win' then 1 else 0 end), 0)::int`,
    losses: sql<number>`coalesce(sum(case when ${partnerPlayerMatches.resultType} = 'loss' then 1 else 0 end), 0)::int`,
    matchesPlayed: sql<number>`coalesce(count(${partnerPlayerMatches.id}), 0)::int`,
    lastPlayedAt: sql<Date | null>`max(${partnerPlayerMatches.playedAt})`,
  };
}

function mapListRow(row: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
  lastPlayedAt: Date | null;
}): PartnerPlayerListItem {
  const wins = Number(row.wins) || 0;
  const losses = Number(row.losses) || 0;
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    avatarUrl: null,
    wins,
    losses,
    matchesPlayed: Number(row.matchesPlayed) || 0,
    winRate: winRateFromCounts(wins, losses),
    lastPlayedAt: row.lastPlayedAt?.toISOString() ?? null,
  };
}

function playerOrderBy(query: PartnerPlayersListQuery): SQL {
  const dir = query.sortDir === "asc" ? asc : desc;
  if (query.sortBy === "name") return dir(partnerPlayers.fullName);
  if (query.sortBy === "wins") {
    return query.sortDir === "asc"
      ? sql`coalesce(sum(case when ${partnerPlayerMatches.resultType} = 'win' then 1 else 0 end), 0) asc`
      : sql`coalesce(sum(case when ${partnerPlayerMatches.resultType} = 'win' then 1 else 0 end), 0) desc`;
  }
  if (query.sortBy === "winRate") {
    return query.sortDir === "asc"
      ? sql`case when coalesce(sum(case when ${partnerPlayerMatches.resultType} in ('win','loss') then 1 else 0 end), 0) = 0 then -1 else (sum(case when ${partnerPlayerMatches.resultType} = 'win' then 1 else 0 end)::float / nullif(sum(case when ${partnerPlayerMatches.resultType} in ('win','loss') then 1 else 0 end), 0)) end asc`
      : sql`case when coalesce(sum(case when ${partnerPlayerMatches.resultType} in ('win','loss') then 1 else 0 end), 0) = 0 then -1 else (sum(case when ${partnerPlayerMatches.resultType} = 'win' then 1 else 0 end)::float / nullif(sum(case when ${partnerPlayerMatches.resultType} in ('win','loss') then 1 else 0 end), 0)) end desc`;
  }
  // matchesPlayed (default)
  return query.sortDir === "asc"
    ? sql`coalesce(count(${partnerPlayerMatches.id}), 0) asc, ${partnerPlayers.fullName} asc`
    : sql`coalesce(count(${partnerPlayerMatches.id}), 0) desc, ${partnerPlayers.fullName} asc`;
}

/** Paginated partner player directory with W/L / win-rate (staff curation). */
export async function queryPartnerPlayers(
  partnerId: string,
  query: PartnerPlayersListQuery,
): Promise<PartnerPagedResult<PartnerPlayerListItem>> {
  const db = getDb();
  const conditions: SQL[] = [
    eq(partnerPlayers.partnerId, partnerId),
    isNull(partnerPlayers.archivedAt),
  ];
  const search = query.search?.trim();
  if (search) {
    conditions.push(
      sql`(${ilike(partnerPlayers.fullName, `%${search}%`)} or ${ilike(partnerPlayers.email, `%${search}%`)} or ${ilike(partnerPlayers.phone, `%${search}%`)})`,
    );
  }
  const where = and(...conditions);
  const offset = toOffset(query.page, query.pageSize);

  const [totalRow] = await db
    .select({ value: count() })
    .from(partnerPlayers)
    .where(where);

  const total = Number(totalRow?.value ?? 0);
  if (total === 0) {
    return toPartnerPagedResult([], 0, query.page, query.pageSize);
  }

  const rows = await db
    .select(statsSelect())
    .from(partnerPlayers)
    .leftJoin(
      partnerPlayerMatches,
      and(
        eq(partnerPlayerMatches.partnerPlayerId, partnerPlayers.id),
        eq(partnerPlayerMatches.partnerId, partnerId),
      ),
    )
    .where(where)
    .groupBy(
      partnerPlayers.id,
      partnerPlayers.fullName,
      partnerPlayers.email,
      partnerPlayers.phone,
    )
    .orderBy(playerOrderBy(query))
    .limit(query.pageSize)
    .offset(offset);

  return toPartnerPagedResult(
    rows.map(mapListRow),
    total,
    query.page,
    query.pageSize,
  );
}

export async function getPartnerPlayerDetail(
  partnerId: string,
  playerId: string,
): Promise<PartnerPlayerDetail | null> {
  const db = getDb();
  const [exists] = await db
    .select({ id: partnerPlayers.id })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.id, playerId),
        eq(partnerPlayers.partnerId, partnerId),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .limit(1);
  if (!exists) return null;

  // Keep detail pages aligned with completed tournament fixtures (idempotent).
  try {
    await rebuildPartnerPlayerStatsFromCompletedMatches({ partnerId, playerId });
  } catch {
    // Non-fatal — still return currently stored aggregates.
  }

  const [row] = await db
    .select(statsSelect())
    .from(partnerPlayers)
    .leftJoin(
      partnerPlayerMatches,
      and(
        eq(partnerPlayerMatches.partnerPlayerId, partnerPlayers.id),
        eq(partnerPlayerMatches.partnerId, partnerId),
      ),
    )
    .where(
      and(
        eq(partnerPlayers.id, playerId),
        eq(partnerPlayers.partnerId, partnerId),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .groupBy(
      partnerPlayers.id,
      partnerPlayers.fullName,
      partnerPlayers.email,
      partnerPlayers.phone,
    )
    .limit(1);

  if (!row) return null;

  const [matches, tournamentResults] = await Promise.all([
    db
      .select({
        id: partnerPlayerMatches.id,
        tournamentId: partnerPlayerMatches.tournamentId,
        tournamentName: partnerPlayerMatches.tournamentName,
        opponents: partnerPlayerMatches.opponents,
        resultType: partnerPlayerMatches.resultType,
        score: partnerPlayerMatches.score,
        round: partnerPlayerMatches.round,
        playedAt: partnerPlayerMatches.playedAt,
      })
      .from(partnerPlayerMatches)
      .where(
        and(
          eq(partnerPlayerMatches.partnerPlayerId, playerId),
          eq(partnerPlayerMatches.partnerId, partnerId),
        ),
      )
      .orderBy(desc(partnerPlayerMatches.playedAt))
      .limit(100),
    db
      .select({
        id: partnerPlayerTournamentResults.id,
        tournamentId: partnerPlayerTournamentResults.tournamentId,
        tournamentName: partnerPlayerTournamentResults.tournamentName,
        category: partnerPlayerTournamentResults.category,
        placement: partnerPlayerTournamentResults.placement,
        placementRank: partnerPlayerTournamentResults.placementRank,
        year: partnerPlayerTournamentResults.year,
        playedAt: partnerPlayerTournamentResults.playedAt,
      })
      .from(partnerPlayerTournamentResults)
      .where(
        and(
          eq(partnerPlayerTournamentResults.partnerPlayerId, playerId),
          eq(partnerPlayerTournamentResults.partnerId, partnerId),
        ),
      )
      .orderBy(
        desc(partnerPlayerTournamentResults.year),
        desc(partnerPlayerTournamentResults.playedAt),
      )
      .limit(50),
  ]);

  return {
    ...mapListRow(row),
    matches: matches.map((m) => ({
      id: m.id,
      tournamentId: m.tournamentId ?? null,
      tournamentName: m.tournamentName,
      opponents: m.opponents,
      resultType: m.resultType === "win" ? "win" : "loss",
      score: m.score ?? null,
      round: m.round ?? null,
      playedAt: m.playedAt.toISOString(),
    })),
    tournamentResults: tournamentResults.map((r) => ({
      id: r.id,
      tournamentId: r.tournamentId ?? null,
      tournamentName: r.tournamentName,
      category: r.category ?? null,
      placement: r.placement,
      placementRank: r.placementRank ?? null,
      year: r.year,
      playedAt: r.playedAt?.toISOString() ?? null,
    })),
  };
}

export async function requirePartnerPlayer(
  partnerId: string,
  playerId: string,
): Promise<PartnerPlayerDetail> {
  const detail = await getPartnerPlayerDetail(partnerId, playerId);
  if (!detail) {
    throw new AppError("Player not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  return detail;
}
