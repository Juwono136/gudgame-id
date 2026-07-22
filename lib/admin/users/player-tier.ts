import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema/wiki";
import {
  formatPlayerTierLabel,
  resolveCareerTierLevel,
  type PlayerTierLevel,
} from "@/lib/player/tier";

export type AdminUserPlayerTierSummary = {
  /** Highest career tier across published player profiles (or Bronze floor). */
  tierLevel: PlayerTierLevel;
  tierLabel: string;
  totalPoints: number;
  /** Number of sport player profiles linked to this user. */
  profileCount: number;
};

function readTotalPoints(performance: Record<string, unknown>): number {
  const raw = performance.totalPoints;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  if (typeof raw === "string" && raw.trim() && !Number.isNaN(Number(raw))) {
    return Math.max(0, Math.round(Number(raw)));
  }
  return 0;
}

const TIER_RANK: Record<PlayerTierLevel, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  international: 4,
};

/**
 * Resolve career tier for admin UI from wiki player performance.
 * Users without a profile default to Bronze / 0 pts.
 */
export async function getAdminUserPlayerTierMap(
  userIds: string[],
): Promise<Map<string, AdminUserPlayerTierSummary>> {
  const map = new Map<string, AdminUserPlayerTierSummary>();
  for (const id of userIds) {
    map.set(id, {
      tierLevel: "bronze",
      tierLabel: formatPlayerTierLabel("bronze")!,
      totalPoints: 0,
      profileCount: 0,
    });
  }
  if (!userIds.length) return map;

  const db = getDb();
  const rows = await db
    .select({
      ownerUserId: wikiEntities.ownerUserId,
      performance: wikiEntities.performance,
      attributes: wikiEntities.attributes,
    })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.entityType, "player"),
        inArray(wikiEntities.ownerUserId, userIds),
      ),
    );

  for (const row of rows) {
    if (!row.ownerUserId) continue;
    const performance = (row.performance ?? {}) as Record<string, unknown>;
    const attributes = (row.attributes ?? {}) as Record<string, unknown>;
    const totalPoints = readTotalPoints(performance);
    const storedTier =
      (typeof performance.tier === "string" ? performance.tier : null) ??
      (typeof attributes.tier === "string" ? attributes.tier : null);
    const tierLevel =
      resolveCareerTierLevel({ totalPoints, storedTier }) ?? "bronze";

    const current = map.get(row.ownerUserId)!;
    const nextPoints = Math.max(current.totalPoints, totalPoints);
    const nextTier =
      TIER_RANK[tierLevel] >= TIER_RANK[current.tierLevel] ? tierLevel : current.tierLevel;

    map.set(row.ownerUserId, {
      tierLevel: nextTier,
      tierLabel: formatPlayerTierLabel(nextTier)!,
      totalPoints: nextPoints,
      profileCount: current.profileCount + 1,
    });
  }

  return map;
}
