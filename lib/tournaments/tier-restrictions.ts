import {
  PLAYER_TIER_LABELS,
  PLAYER_TIER_LEVELS,
  formatPlayerTierLabel,
  normalizePlayerTier,
  type PlayerTierLevel,
} from "@/lib/player/tier";

/** Tournaments that support player skill tier eligibility rules. */
export function tournamentUsesTierRestrictions(
  tournamentType: string | null | undefined,
  officialBilling: string | null | undefined,
): boolean {
  if (tournamentType === "fun_match") return true;
  if (tournamentType === "official" && officialBilling === "free") return true;
  return false;
}

export function normalizeAllowedTierLevels(
  raw: unknown,
): PlayerTierLevel[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<PlayerTierLevel>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const normalized = normalizePlayerTier(item);
    if (normalized) seen.add(normalized);
  }
  const ordered = PLAYER_TIER_LEVELS.filter((tier) => seen.has(tier));
  return ordered.length > 0 ? ordered : undefined;
}

/** Effective allowed tiers for a restricted tournament (defaults to all tiers). */
export function resolveAllowedTierLevels(
  tournamentType: string | null | undefined,
  officialBilling: string | null | undefined,
  configured: PlayerTierLevel[] | undefined,
): PlayerTierLevel[] | null {
  if (!tournamentUsesTierRestrictions(tournamentType, officialBilling)) return null;
  return configured?.length ? configured : [...PLAYER_TIER_LEVELS];
}

export function isPlayerTierAllowed(
  playerTier: PlayerTierLevel | null | undefined,
  allowedTiers: PlayerTierLevel[] | null,
): boolean {
  if (!allowedTiers?.length) return true;
  const tier = playerTier ?? "pemula";
  return allowedTiers.includes(tier);
}

export function formatAllowedTierLevelsLabel(
  allowedTiers: PlayerTierLevel[] | null | undefined,
): string | null {
  if (!allowedTiers?.length) return null;
  if (allowedTiers.length === PLAYER_TIER_LEVELS.length) return "All skill levels";
  return allowedTiers.map((tier) => PLAYER_TIER_LABELS[tier]).join(", ");
}

export function formatPlayerTierRestrictionMessage(input: {
  playerTier: PlayerTierLevel | null | undefined;
  allowedTiers: PlayerTierLevel[];
  tournamentLabel?: string;
}): string {
  const playerLabel = formatPlayerTierLabel(input.playerTier) ?? "Beginner";
  const allowedLabel = formatAllowedTierLevelsLabel(input.allowedTiers) ?? "selected tiers";
  const scope = input.tournamentLabel ? ` for ${input.tournamentLabel}` : "";
  return `Your current tier is ${playerLabel}. This tournament${scope} is open to ${allowedLabel} players only.`;
}

export type TournamentTierEligibilityView = {
  restricted: boolean;
  allowedTierLevels: PlayerTierLevel[] | null;
  allowedTierLabel: string | null;
  playerTierLevel: PlayerTierLevel | null;
  playerTierLabel: string | null;
  eligible: boolean;
  message: string | null;
};
