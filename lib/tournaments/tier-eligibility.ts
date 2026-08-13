import "server-only";

import { computePlayerMatchStats } from "@/lib/account/player-performance/compute";
import { AppError } from "@/lib/errors";
import { formatPlayerTierLabel } from "@/lib/player/tier";
import type { PlayerTierLevel } from "@/lib/player/tier";
import {
  formatAllowedTierLevelsLabel,
  formatPlayerTierRestrictionMessage,
  isPlayerTierAllowed,
  resolveAllowedTierLevels,
  tournamentUsesTierRestrictions,
  type TournamentTierEligibilityView,
} from "@/lib/tournaments/tier-restrictions";
import { getTournamentAllowedTierLevels, parseTournamentSettings } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type TournamentTierEligibility = TournamentTierEligibilityView;

export async function getPlayerTierForSport(
  userId: string,
  sportId: string,
): Promise<PlayerTierLevel> {
  const stats = await computePlayerMatchStats(userId, sportId);
  return stats.tierLevel ?? "bronze";
}

export async function evaluateTournamentTierEligibility(
  tournament: TournamentDetail,
  userId: string,
): Promise<TournamentTierEligibility> {
  if (tournament.partnerId) {
    return {
      restricted: false,
      allowedTierLevels: null,
      allowedTierLabel: null,
      playerTierLevel: null,
      playerTierLabel: null,
      eligible: true,
      message: null,
    };
  }

  const rankingMode = parseTournamentSettings(tournament.settings).rankingMode;
  const restricted = tournamentUsesTierRestrictions(
    tournament.tournamentType,
    tournament.officialBilling,
    rankingMode,
  );
  const allowedTierLevels = getTournamentAllowedTierLevels(tournament);
  const playerTierLevel = restricted
    ? await getPlayerTierForSport(userId, tournament.sportId)
    : null;
  const eligible =
    !restricted || isPlayerTierAllowed(playerTierLevel, allowedTierLevels);

  return {
    restricted,
    allowedTierLevels,
    allowedTierLabel: formatAllowedTierLevelsLabel(allowedTierLevels),
    playerTierLevel,
    playerTierLabel: playerTierLevel ? formatPlayerTierLabel(playerTierLevel) : null,
    eligible,
    message:
      eligible || !restricted || !allowedTierLevels?.length
        ? null
        : formatPlayerTierRestrictionMessage({
            playerTier: playerTierLevel,
            allowedTiers: allowedTierLevels,
            tournamentLabel: tournament.name,
          }),
  };
}

export async function assertUserEligibleForTournamentTier(
  userId: string,
  tournament: TournamentDetail,
): Promise<void> {
  if (tournament.partnerId) return;
  const rankingMode = parseTournamentSettings(tournament.settings).rankingMode;
  if (
    !tournamentUsesTierRestrictions(
      tournament.tournamentType,
      tournament.officialBilling,
      rankingMode,
    )
  ) {
    return;
  }

  const allowed = getTournamentAllowedTierLevels(tournament);
  if (!allowed?.length) return;

  const playerTier = await getPlayerTierForSport(userId, tournament.sportId);
  if (!isPlayerTierAllowed(playerTier, allowed)) {
    throw new AppError(
      formatPlayerTierRestrictionMessage({
        playerTier,
        allowedTiers: allowed,
        tournamentLabel: tournament.name,
      }),
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }
}

export async function assertUsersEligibleForTournamentTier(
  userIds: string[],
  tournament: TournamentDetail,
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const userId of unique) {
    await assertUserEligibleForTournamentTier(userId, tournament);
  }
}
