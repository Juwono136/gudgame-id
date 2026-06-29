import type {
  OfficialBillingType,
  TournamentType,
} from "@/db/schema/tournaments";
import { LEGACY_TOURNAMENT_TYPE_RECREATIONAL } from "@/db/schema/tournaments";
import type { StatsTier } from "@/db/schema/player-competition";

/** Normalize legacy recreational → fun_match */
export function normalizeTournamentType(value: string | null | undefined): TournamentType {
  if (value === LEGACY_TOURNAMENT_TYPE_RECREATIONAL || value === "fun_match") {
    return "fun_match";
  }
  if (value === "official") {
    return "official";
  }
  return "fun_match";
}

export function isFunMatchType(value: string | null | undefined): boolean {
  return normalizeTournamentType(value) === "fun_match";
}

export function isOfficialType(value: string | null | undefined): boolean {
  return normalizeTournamentType(value) === "official";
}

/** Player invite links — Fun Match and free official events. */
export function supportsPlayerInvites(input: {
  tournamentType: string | null | undefined;
  officialBilling?: OfficialBillingType | string | null;
}): boolean {
  if (isFunMatchType(input.tournamentType)) return true;
  return isOfficialType(input.tournamentType) && input.officialBilling === "free";
}

/** Round-robin lobby scoring (Fun Match or Official Americano). */
export function supportsRoundBasedPlay(input: {
  tournamentType: string | null | undefined;
  format: string | null | undefined;
}): boolean {
  return (
    isFunMatchType(input.tournamentType) ||
    (isOfficialType(input.tournamentType) && input.format === "americano")
  );
}

export function deriveStatsTier(input: {
  tournamentType: string | null | undefined;
  officialBilling: OfficialBillingType | string | null | undefined;
}): StatsTier {
  const type = normalizeTournamentType(input.tournamentType);
  if (type === "fun_match") {
    return "fun_match";
  }
  if (input.officialBilling === "free") {
    return "official_free";
  }
  return "official_paid";
}

export function statsTierIsOfficialRanked(tier: StatsTier): boolean {
  return tier === "official_paid" || tier === "official_free";
}

export const TOURNAMENT_NOT_STARTED_MESSAGE =
  "The tournament is not yet underway, information will appear here soon.";

export type TournamentLivePhase = "not_started" | "live" | "completed" | "cancelled";

export function resolveTournamentLivePhase(
  status: string | null | undefined,
): TournamentLivePhase {
  if (status === "live") return "live";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "not_started";
}

export function normalizePlayerCompetitionType(
  value: string | null | undefined,
  isOfficial: boolean,
): "official" | "fun_match" {
  if (value === "official") return "official";
  if (value === "fun_match" || value === "recreational") return "fun_match";
  return isOfficial ? "official" : "fun_match";
}

export function isLiveOrCompletedPhase(phase: TournamentLivePhase): boolean {
  return phase === "live" || phase === "completed";
}
