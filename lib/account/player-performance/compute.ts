import "server-only";

import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerMatches, type StatsTier } from "@/db/schema/player-competition";
import { sports, tournaments } from "@/db/schema";
import { deriveTierFromPoints, type PlayerTierLevel } from "@/lib/player/tier";
import { rankingDeltaForMatch } from "@/lib/account/player-performance/points";
import { getPlayerRankOnLeaderboard } from "@/lib/wiki/player-leaderboard";
import { loadSkillTierByTournamentIds } from "@/lib/tournaments/skill-tier";

export type PlayerMatchAggregate = {
  totalMatches: number;
  wins: number;
  losses: number;
  officialMatches: number;
  funMatches: number;
  totalPoints: number;
  winRate: number | null;
  tierLevel: PlayerTierLevel | null;
  firstMatchAt: string | null;
  lastMatchAt: string | null;
};

function aggregateRows(
  rows: {
    resultType: string;
    isOfficial: boolean;
    statsTier: string | null;
    tournamentId: string | null;
    playedAt: Date;
  }[],
  skillByTournament: Map<string, PlayerTierLevel>,
): PlayerMatchAggregate {
  let wins = 0;
  let losses = 0;
  let officialMatches = 0;
  let funMatches = 0;
  let totalPoints = 0;
  let firstMatchAt: Date | null = null;
  let lastMatchAt: Date | null = null;

  for (const row of rows) {
    const result = row.resultType === "win" ? "win" : "loss";

    // Fun Match history may exist, but never affects ranking / tier / win rate.
    if (!row.isOfficial || row.statsTier === "fun_match") {
      funMatches += 1;
      if (!firstMatchAt || row.playedAt < firstMatchAt) firstMatchAt = row.playedAt;
      if (!lastMatchAt || row.playedAt > lastMatchAt) lastMatchAt = row.playedAt;
      continue;
    }

    if (result === "win") wins += 1;
    else losses += 1;
    officialMatches += 1;

    const skillTier =
      (row.tournamentId ? skillByTournament.get(row.tournamentId) : null) ?? null;

    totalPoints += rankingDeltaForMatch({
      isOfficial: true,
      statsTier: row.statsTier as StatsTier | null,
      skillTier,
      resultType: result,
    });

    if (!firstMatchAt || row.playedAt < firstMatchAt) firstMatchAt = row.playedAt;
    if (!lastMatchAt || row.playedAt > lastMatchAt) lastMatchAt = row.playedAt;
  }

  const totalMatches = wins + losses;
  const winRate =
    totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 10 : null;

  return {
    totalMatches,
    wins,
    losses,
    officialMatches,
    funMatches,
    totalPoints,
    winRate,
    tierLevel: deriveTierFromPoints(totalPoints),
    firstMatchAt: firstMatchAt?.toISOString() ?? null,
    lastMatchAt: lastMatchAt?.toISOString() ?? null,
  };
}

export async function computePlayerMatchStats(
  userId: string,
  sportId?: string | null,
): Promise<PlayerMatchAggregate> {
  const db = getDb();
  const conditions = [eq(playerMatches.userId, userId), isNull(playerMatches.partnerId)];
  if (sportId) {
    conditions.push(eq(playerMatches.sportId, sportId));
  }

  const rows = await db
    .select({
      resultType: playerMatches.resultType,
      isOfficial: playerMatches.isOfficial,
      statsTier: playerMatches.statsTier,
      tournamentId: playerMatches.tournamentId,
      playedAt: playerMatches.playedAt,
    })
    .from(playerMatches)
    .where(and(...conditions))
    .orderBy(asc(playerMatches.playedAt));

  const tournamentIds = [
    ...new Set(rows.map((r) => r.tournamentId).filter((id): id is string => Boolean(id))),
  ];
  const skillByTournament = await loadSkillTierByTournamentIds(tournamentIds);
  return aggregateRows(rows, skillByTournament);
}

export async function computeTournamentUserStats(
  userId: string,
  tournamentId: string,
): Promise<Pick<PlayerMatchAggregate, "wins" | "losses" | "totalMatches" | "winRate" | "totalPoints">> {
  const db = getDb();
  const rows = await db
    .select({
      resultType: playerMatches.resultType,
      isOfficial: playerMatches.isOfficial,
      statsTier: playerMatches.statsTier,
      tournamentId: playerMatches.tournamentId,
      playedAt: playerMatches.playedAt,
    })
    .from(playerMatches)
    .where(
      and(eq(playerMatches.userId, userId), eq(playerMatches.tournamentId, tournamentId)),
    );

  const skillByTournament = await loadSkillTierByTournamentIds([tournamentId]);
  const agg = aggregateRows(rows, skillByTournament);
  return {
    wins: agg.wins,
    losses: agg.losses,
    totalMatches: agg.totalMatches,
    winRate: agg.winRate,
    totalPoints: agg.totalPoints,
  };
}

export async function computeSportRank(
  sportId: string,
  userId: string,
  _totalPoints: number,
): Promise<number> {
  const db = getDb();
  const [sportRow] = await db
    .select({ slug: sports.slug })
    .from(sports)
    .where(eq(sports.id, sportId))
    .limit(1);

  if (sportRow?.slug) {
    const rank = await getPlayerRankOnLeaderboard(sportRow.slug, userId);
    if (rank != null) return rank;
  }

  // Fallback: count players with higher official match win totals (approx).
  const [row] = await db
    .select({
      rank: sql<number>`(
        1 + (
          SELECT COUNT(DISTINCT pm.user_id)::int
          FROM player_matches pm
          WHERE pm.sport_id = ${sportId}
            AND pm.user_id <> ${userId}
            AND pm.is_official = true
            AND COALESCE(pm.stats_tier, 'official_free') <> 'fun_match'
            AND (
              SELECT COUNT(*) FILTER (WHERE pm2.result_type = 'win')
              FROM player_matches pm2
              WHERE pm2.user_id = pm.user_id AND pm2.sport_id = ${sportId} AND pm2.is_official = true
            ) > (
              SELECT COUNT(*) FILTER (WHERE pm3.result_type = 'win')
              FROM player_matches pm3
              WHERE pm3.user_id = ${userId} AND pm3.sport_id = ${sportId} AND pm3.is_official = true
            )
        )
      )`,
    })
    .from(playerMatches)
    .limit(1);

  return Number(row?.rank) || 1;
}

export async function countPlayerMatches(
  userId: string,
  filters?: { tournamentId?: string; sportId?: string },
): Promise<number> {
  const db = getDb();
  const conditions = [eq(playerMatches.userId, userId)];
  if (filters?.tournamentId) {
    conditions.push(eq(playerMatches.tournamentId, filters.tournamentId));
  }
  if (filters?.sportId) {
    conditions.push(eq(playerMatches.sportId, filters.sportId));
  }
  const [row] = await db
    .select({ count: count() })
    .from(playerMatches)
    .where(and(...conditions));
  return Number(row?.count ?? 0);
}
