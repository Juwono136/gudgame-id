import {
  PLAYER_TIER_LABELS,
  PLAYER_TIER_LEVELS,
  formatPlayerTierLabel,
  normalizePlayerTier,
  type PlayerTierLevel,
} from "@/lib/player/tier";

export function tournamentUsesTierRestrictions(
  tournamentType: string | null | undefined,
  _officialBilling?: string | null | undefined,
  rankingMode?: string | null | undefined,
): boolean {
  if (tournamentType !== "official") return false;
  if (rankingMode === "open") return false;
  return true;
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

export function resolveTournamentSkillTier(
  tournamentType: string | null | undefined,
  officialBilling: string | null | undefined,
  configured: PlayerTierLevel[] | undefined,
  rankingMode?: string | null | undefined,
): PlayerTierLevel | null {
  if (!tournamentUsesTierRestrictions(tournamentType, officialBilling, rankingMode)) {
    return null;
  }
  if (configured?.length) return configured[0] ?? null;
  return "bronze";
}

/** Effective allowed tiers for a restricted tournament (exactly one skill tier). */
export function resolveAllowedTierLevels(
  tournamentType: string | null | undefined,
  officialBilling: string | null | undefined,
  configured: PlayerTierLevel[] | undefined,
  rankingMode?: string | null | undefined,
): PlayerTierLevel[] | null {
  const skill = resolveTournamentSkillTier(
    tournamentType,
    officialBilling,
    configured,
    rankingMode,
  );
  return skill ? [skill] : null;
}

/** Exact match: player tier must equal the tournament tier. */
export function isPlayerTierAllowed(
  playerTier: PlayerTierLevel | null | undefined,
  allowedTiers: PlayerTierLevel[] | null,
): boolean {
  if (!allowedTiers?.length) return true;
  const tier = playerTier ?? "bronze";
  return allowedTiers.includes(tier);
}

export function formatAllowedTierLevelsLabel(
  allowedTiers: PlayerTierLevel[] | null | undefined,
): string | null {
  if (!allowedTiers?.length) return null;
  return allowedTiers.map((tier) => PLAYER_TIER_LABELS[tier]).join(", ");
}

export function formatPlayerTierRestrictionMessage(input: {
  playerTier: PlayerTierLevel | null | undefined;
  allowedTiers: PlayerTierLevel[];
  tournamentLabel?: string;
}): string {
  const playerLabel = formatPlayerTierLabel(input.playerTier) ?? "Bronze";
  const allowedLabel = formatAllowedTierLevelsLabel(input.allowedTiers) ?? "this tier";
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
