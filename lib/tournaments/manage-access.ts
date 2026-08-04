import "server-only";

import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import {
  buildTournamentParticipantContext,
  type TournamentParticipantContext,
} from "@/lib/tournaments/participant-access";
import {
  canAccessTournamentManagePage,
  canManageBracketSetup,
  canManageLiveScoring,
  isTournamentOwner,
} from "@/lib/tournaments/permissions";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
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
 * Edit/delete tournament settings — owner or partner org member (not invited scorekeepers).
 */
export async function assertCanEditTournamentSettings(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
): Promise<TournamentManageAccess> {
  const access = await resolveTournamentManageAccess(tournament, userId, roles);
  if (access.isOwner || access.isPartnerMember) {
    return access;
  }
  throw new AppError("Only the organizer or partner staff can edit this tournament.", {
    code: "FORBIDDEN",
    statusCode: 403,
  });
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

export async function assertCanManageScoring(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
): Promise<TournamentManageAccess> {
  const access = await resolveTournamentManageAccess(tournament, userId, roles);
  if (!access.canManageScoring) {
    throw new AppError(
      "Only the organizer, partner staff, or invited scorekeepers can manage live scoring.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }
  return access;
}

export async function assertCanManageBracket(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
): Promise<TournamentManageAccess> {
  const access = await resolveTournamentManageAccess(tournament, userId, roles);
  if (!access.canManageBracket) {
    throw new AppError(
      "Only the organizer, partner staff, or invited bracket managers can manage the bracket.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }
  return access;
}

/** Owner or partner org member — roster edits (remove teams/players). */
export async function assertCanManageRoster(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
): Promise<TournamentManageAccess> {
  const access = await resolveTournamentManageAccess(tournament, userId, roles);
  if (access.isOwner || access.isPartnerMember) {
    return access;
  }
  throw new AppError("Only the organizer or partner staff can remove teams or players.", {
    code: "FORBIDDEN",
    statusCode: 403,
  });
}

/**
 * Participant context aligned with manage ACL (includes partner org members).
 * Use this in scoring / host-control API routes instead of building context without partner membership.
 */
export async function resolveManageParticipantContext(
  tournament: TournamentDetail,
  userId: string | null,
  roles: AppRole[],
): Promise<{
  access: TournamentManageAccess | null;
  userTeamId: string | null;
  participant: TournamentParticipantContext;
}> {
  if (!userId) {
    return {
      access: null,
      userTeamId: null,
      participant: buildTournamentParticipantContext({
        userId: null,
        userTeamId: null,
        roles,
        tournament,
      }),
    };
  }

  const [access, userTeamId] = await Promise.all([
    resolveTournamentManageAccess(tournament, userId, roles),
    getUserTeamInTournament(tournament.id, userId),
  ]);

  return {
    access,
    userTeamId,
    participant: buildTournamentParticipantContext({
      userId,
      userTeamId,
      roles,
      tournament,
      grantRole: access.grantRole,
      isPartnerMember: access.isPartnerMember,
    }),
  };
}
