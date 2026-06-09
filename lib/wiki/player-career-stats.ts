import "server-only";

import type { PlayerEquipmentItem } from "@/lib/wiki/player-equipment";
import { equipmentFromAttributes } from "@/lib/wiki/player-equipment";
import { parsePlayerEditableAttributes } from "@/lib/wiki/player-profile-fields";

export type PlayerCareerStats = {
  worldRank: number | null;
  totalPoints: number | null;
  winRate: number | null;
  careerTitles: number | null;
  tier: string | null;
  yearsActive: string | null;
};

export type PlayerCareerStatsSource = {
  id: number;
  attributes: Record<string, unknown>;
  performance: Record<string, unknown>;
};

/**
 * Tournament-driven stats (read-only). Values come from `performance` JSON until
 * the tournament module writes match results into dedicated tables.
 */
export function getPlayerCareerStats(entity: PlayerCareerStatsSource): PlayerCareerStats {
  const perf = entity.performance ?? {};
  const editable = parsePlayerEditableAttributes(entity.attributes);

  const num = (key: string): number | null => {
    const v = perf[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
    return null;
  };

  const tierRaw = perf.tier ?? entity.attributes.tier;
  const tier =
    typeof tierRaw === "string" && tierRaw.trim()
      ? tierRaw
      : deriveTierFromPoints(num("totalPoints"));

  return {
    worldRank: num("worldRank"),
    totalPoints: num("totalPoints"),
    winRate: num("winRate"),
    careerTitles: num("careerTitles"),
    tier,
    yearsActive: computeYearsActive(editable.proSince, editable.firstTournamentAt),
  };
}

function deriveTierFromPoints(points: number | null): string | null {
  if (points == null) return null;
  if (points >= 10000) return "gold";
  if (points >= 5000) return "silver";
  if (points >= 1000) return "bronze";
  return "pro";
}

function computeYearsActive(
  proSince: string | null | undefined,
  firstTournamentAt: string | null | undefined,
): string | null {
  const startIso = firstTournamentAt ?? proSince;
  if (!startIso) return null;

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;

  const startYear = start.getFullYear();
  const nowYear = new Date().getFullYear();
  if (startYear > nowYear) return null;

  return startYear === nowYear ? `${startYear}` : `${startYear}–Present`;
}

export function getSignatureGearItem(
  attributes: Record<string, unknown>,
): PlayerEquipmentItem | null {
  const equipment = equipmentFromAttributes(attributes);
  const signatureId = attributes.signatureGearId;
  if (typeof signatureId !== "string" || !signatureId) return null;
  return equipment.find((e) => e.id === signatureId) ?? null;
}
