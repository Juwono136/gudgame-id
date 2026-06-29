import "server-only";

import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import {
  canManageBracketSetup,
  canManageLiveScoring,
  canManageTournament,
} from "@/lib/tournaments/permissions";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type TournamentManageAccess = {
  grantRole: string | null;
  isOwner: boolean;
  canAccessManagePage: boolean;
  canManageBracket: boolean;
  canManageScoring: boolean;
};

export async function resolveTournamentManageAccess(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
): Promise<TournamentManageAccess> {
  const grantRole = await getActiveAccessGrantRole(tournament.id, userId);
  const isOwner = canManageTournament(roles, tournament.createdBy, userId);
  const canAccessManagePage = isOwner || grantRole != null;
  const canManageBracket = canManageBracketSetup(roles, tournament, userId, grantRole);
  const canManageScoring = canManageLiveScoring(roles, tournament, userId, grantRole);

  return {
    grantRole,
    isOwner,
    canAccessManagePage,
    canManageBracket,
    canManageScoring,
  };
}

export async function assertTournamentManagePageAccess(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
): Promise<TournamentManageAccess> {
  const access = await resolveTournamentManageAccess(tournament, userId, roles);
  if (!access.canAccessManagePage) {
    throw new AppError("Only the tournament owner or invited staff can access manage", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  return access;
}
