import "server-only";

import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports, user, wikiEntities } from "@/db/schema";
import { computeOwnedPlayerCareerStats } from "@/lib/account/player-performance/compute-owned-career-stats";
import { withCache, getCached, setCached, invalidateCached } from "@/lib/cache/redis-cache";
import { formatPlayerTierLabel, normalizePlayerTier } from "@/lib/player/tier";
import { archiveOrphanPublishedPlayerProfiles } from "@/lib/wiki/active-player-eligibility";
import { parsePlayerEditableAttributes } from "@/lib/wiki/player-profile-fields";
import type { PlayerCareerStats } from "@/lib/wiki/player-career-stats";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";

const PLAYERS_CACHE_PREFIX = "players";
const LEADERBOARD_TTL_SECONDS = 45;
const ORPHAN_ARCHIVE_THROTTLE_SECONDS = 3600;

export type ActivePlayerLeaderboardEntry = {
  slug: string;
  displayName: string;
  nickname: string | null;
  summary: string | null;
  avatarUrl: string | null;
  attributes: Record<string, unknown>;
  ownerUserId: string;
  sportId: string;
  career: PlayerCareerStats;
  totalPoints: number;
  rank: number;
};

function readPlayerField(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function assignDenseRanks(
  entries: Omit<ActivePlayerLeaderboardEntry, "rank">[],
): ActivePlayerLeaderboardEntry[] {
  let rank = 1;
  return entries.map((entry, index) => {
    if (index > 0 && entry.totalPoints < entries[index - 1]!.totalPoints) {
      rank = index + 1;
    }
    return { ...entry, rank };
  });
}

/** At most once per hour — never blocks every public list GET. */
async function maybeArchiveOrphansThrottled(): Promise<void> {
  const throttleKey = "orphan-archive";
  const recent = await getCached<{ hit: true }>(throttleKey, {
    prefix: PLAYERS_CACHE_PREFIX,
  });
  if (recent?.hit) return;

  await setCached(throttleKey, { hit: true }, {
    prefix: PLAYERS_CACHE_PREFIX,
    ttlSeconds: ORPHAN_ARCHIVE_THROTTLE_SECONDS,
  });

  try {
    await archiveOrphanPublishedPlayerProfiles();
  } catch {
    /* non-fatal housekeeping */
  }
}

async function buildActivePlayerLeaderboardUncached(
  sportSlug: string,
): Promise<ActivePlayerLeaderboardEntry[]> {
  await maybeArchiveOrphansThrottled();

  const db = getDb();
  const rows = await db
    .select({
      slug: wikiEntities.slug,
      displayName: wikiEntities.displayName,
      nickname: wikiEntities.nickname,
      summary: wikiEntities.summary,
      primaryImageUrl: wikiEntities.primaryImageUrl,
      primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
      attributes: wikiEntities.attributes,
      performance: wikiEntities.performance,
      ownerUserId: wikiEntities.ownerUserId,
      sportId: wikiEntities.sportId,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .innerJoin(user, eq(wikiEntities.ownerUserId, user.id))
    .where(
      and(
        eq(sports.slug, sportSlug),
        eq(wikiEntities.entityType, "player"),
        eq(wikiEntities.status, "published"),
        eq(user.isActive, true),
      ),
    )
    .orderBy(asc(wikiEntities.displayName));

  const withStats = await Promise.all(
    rows.map(async (row) => {
      const attributes = (row.attributes ?? {}) as Record<string, unknown>;
      const performance = (row.performance ?? {}) as Record<string, unknown>;
      const career = await computeOwnedPlayerCareerStats({
        entity: {
          id: row.slug,
          attributes,
          performance,
        },
        ownerUserId: row.ownerUserId!,
        sportId: row.sportId,
      });

      return {
        slug: row.slug,
        displayName: row.displayName,
        nickname: row.nickname,
        summary: row.summary,
        avatarUrl: resolveWikiImageUrl(row.primaryImageUrl, row.primaryImageStorageKey),
        attributes,
        ownerUserId: row.ownerUserId!,
        sportId: row.sportId,
        career,
        totalPoints: career.totalPoints ?? 0,
      };
    }),
  );

  withStats.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });

  return assignDenseRanks(withStats);
}

async function getActivePlayerLeaderboardCached(
  sportSlug: string,
): Promise<ActivePlayerLeaderboardEntry[]> {
  return withCache(
    `leaderboard:${sportSlug}`,
    () => buildActivePlayerLeaderboardUncached(sportSlug),
    { prefix: PLAYERS_CACHE_PREFIX, ttlSeconds: LEADERBOARD_TTL_SECONDS },
  );
}

/** Request-scoped + Redis — shared by player list API and profile rank. */
export const getActivePlayerLeaderboard = cache(getActivePlayerLeaderboardCached);

export async function invalidatePlayerLeaderboardCache(sportSlug: string): Promise<void> {
  await invalidateCached(`leaderboard:${sportSlug}`, PLAYERS_CACHE_PREFIX);
}

export async function getPlayerRankOnLeaderboard(
  sportSlug: string,
  ownerUserId: string,
): Promise<number | null> {
  const board = await getActivePlayerLeaderboard(sportSlug);
  return board.find((entry) => entry.ownerUserId === ownerUserId)?.rank ?? null;
}

export function mapLeaderboardEntryToListItem(entry: ActivePlayerLeaderboardEntry) {
  const editable = parsePlayerEditableAttributes(entry.attributes);
  const tierLevel =
    entry.career.tierLevel ??
    normalizePlayerTier(readPlayerField(entry.attributes, "tier")) ??
    "pemula";
  const tier = entry.career.tier ?? formatPlayerTierLabel(tierLevel) ?? "Beginner";

  return {
    rank: entry.rank,
    slug: entry.slug,
    displayName: entry.displayName,
    nickname: entry.nickname,
    avatarUrl: entry.avatarUrl,
    nationality: editable.nationality ?? readPlayerField(entry.attributes, "nationality"),
    province: readPlayerField(entry.attributes, "province"),
    age: editable.age ?? null,
    points: entry.career.totalPoints,
    tier,
    tierLevel,
    playingStyle: readPlayerField(entry.attributes, "playingStyle"),
    winRate: entry.career.winRate,
    worldRank: entry.rank,
    yearsActive: entry.career.yearsActive,
    summary: entry.summary,
  };
}
