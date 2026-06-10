/** Player skill tier — shown instead of "Career titles" on profiles and dashboards */

export const PLAYER_TIER_LEVELS = ["pemula", "menengah", "pro", "gold"] as const;
export type PlayerTierLevel = (typeof PLAYER_TIER_LEVELS)[number];

export const PLAYER_TIER_LABELS: Record<PlayerTierLevel, string> = {
  pemula: "Pemula",
  menengah: "Menengah",
  pro: "Pro",
  gold: "Gold",
};

const TIER_ALIASES: Record<string, PlayerTierLevel> = {
  pemula: "pemula",
  beginner: "pemula",
  bronze: "pemula",
  menengah: "menengah",
  intermediate: "menengah",
  silver: "menengah",
  pro: "pro",
  professional: "pro",
  gold: "gold",
  platinum: "gold",
};

export function normalizePlayerTier(raw: string | null | undefined): PlayerTierLevel | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase().replace(/\s+tier$/, "");
  return TIER_ALIASES[key] ?? null;
}

export function formatPlayerTierLabel(raw: string | null | undefined): string | null {
  const normalized = normalizePlayerTier(raw);
  if (normalized) return PLAYER_TIER_LABELS[normalized];
  if (raw?.trim()) return raw.trim();
  return null;
}

export function deriveTierFromPoints(points: number | null): PlayerTierLevel | null {
  if (points == null) return null;
  if (points >= 10000) return "gold";
  if (points >= 5000) return "pro";
  if (points >= 1000) return "menengah";
  return "pemula";
}
