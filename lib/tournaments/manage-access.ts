import "server-only";

import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import {
  canAccessTournamentManagePage,
  canManageBracketSetup,
  canManageLiveScoring,
  isTournamentOwner,
} from "@/lib/tournaments/permissions";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { isUserPartnerMember } from "@/lib/partners/membership";

export type TournamentManageAccess = {
  grantRole: string | null;
  isOwner: boolean;
  isPartnerMember: boolean;
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
  const isOwner = isTournamentOwner(tournament.createdBy, userId);
  const isPartnerMember = tournament.partnerId
    ? await isUserPartnerMember(userId, tournament.partnerId)
    : false;
  const canAccessManagePage =
    canAccessTournamentManagePage(tournament.createdBy, userId, grantRole) ||
    isPartnerMember;
  const canManageBracket =
    canManageBracketSetup(roles, tournament, userId, grantRole) || isPartnerMember;
  const canManageScoring =
    canManageLiveScoring(roles, tournament, userId, grantRole) || isPartnerMember;

  return {
    grantRole,
    isOwner,
    isPartnerMember,
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

/**
 * Staff invite create/list/revoke — tournament owner, or partner org member for white-label events.
 */
export async function assertCanManageStaffInvites(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
): Promise<TournamentManageAccess> {
  const access = await resolveTournamentManageAccess(tournament, userId, roles);
  if (access.isOwner || access.isPartnerMember) {
    return access;
  }
  throw new AppError("Only the organizer or partner staff can manage invites.", {
    code: "FORBIDDEN",
    statusCode: 403,
  });
}
