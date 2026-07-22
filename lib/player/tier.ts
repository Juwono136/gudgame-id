/** Player / tournament skill tiers — ranking & eligibility (Official only). */

export const PLAYER_TIER_LEVELS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "international",
] as const;

export type PlayerTierLevel = (typeof PLAYER_TIER_LEVELS)[number];

export const PLAYER_TIER_LABELS: Record<PlayerTierLevel, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  international: "International / National",
};

/** Ranking points awarded for a win (loss subtracts the same amount). */
export const TOURNAMENT_TIER_MATCH_POINTS: Record<PlayerTierLevel, number> = {
  bronze: 1,
  silver: 3,
  gold: 5,
  platinum: 8,
  international: 10,
};

/** Ordered progression for profile UX. */
export const PLAYER_TIER_PATH = PLAYER_TIER_LEVELS.map(
  (tier) => PLAYER_TIER_LABELS[tier],
) as readonly string[];

/** Minimum net ranking points to hold each tier (Bronze is the floor). */
export const PLAYER_TIER_POINT_THRESHOLDS: Record<PlayerTierLevel, number> = {
  bronze: 0,
  silver: 15,
  gold: 40,
  platinum: 80,
  international: 150,
};

const TIER_ALIASES: Record<string, PlayerTierLevel> = {
  bronze: "bronze",
  pemula: "bronze",
  beginner: "bronze",
  silver: "silver",
  menengah: "silver",
  intermediate: "silver",
  gold: "gold",
  pro: "gold",
  professional: "gold",
  platinum: "platinum",
  international: "international",
  national: "international",
  "international/national": "international",
  "international / national": "international",
};

export function normalizePlayerTier(raw: string | null | undefined): PlayerTierLevel | null {
  if (!raw?.trim()) return null;
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/\s+tier$/, "")
    .replace(/\s+/g, " ");
  return TIER_ALIASES[key] ?? null;
}

export function formatPlayerTierLabel(raw: string | null | undefined): string | null {
  const normalized = normalizePlayerTier(raw);
  if (normalized) return PLAYER_TIER_LABELS[normalized];
  if (raw?.trim()) return raw.trim();
  return null;
}

export function deriveTierFromPoints(points: number | null): PlayerTierLevel | null {
  if (points == null || Number.isNaN(points)) return null;
  const net = Math.max(0, Math.round(points));
  if (net >= PLAYER_TIER_POINT_THRESHOLDS.international) return "international";
  if (net >= PLAYER_TIER_POINT_THRESHOLDS.platinum) return "platinum";
  if (net >= PLAYER_TIER_POINT_THRESHOLDS.gold) return "gold";
  if (net >= PLAYER_TIER_POINT_THRESHOLDS.silver) return "silver";
  return "bronze";
}

/**
 * Career tier for public profiles — ranking points are the source of truth.
 * Stored wiki `tier` fields are only used when no point total exists yet.
 */
export function resolveCareerTierLevel(input: {
  totalPoints: number | null | undefined;
  storedTier?: string | null;
}): PlayerTierLevel | null {
  if (input.totalPoints != null && !Number.isNaN(input.totalPoints)) {
    return deriveTierFromPoints(input.totalPoints);
  }
  return normalizePlayerTier(input.storedTier ?? null);
}

export function matchPointsForTournamentTier(tier: PlayerTierLevel): number {
  return TOURNAMENT_TIER_MATCH_POINTS[tier];
}
