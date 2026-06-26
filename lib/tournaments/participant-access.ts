import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";

export type TournamentParticipantContext = {
  isAuthenticated: boolean;
  userId: string | null;
  userTeamId: string | null;
  isHost: boolean;
  isParticipant: boolean;
  isRuntimeManager: boolean;
  canUseCourtsideScoring: boolean;
  canUseHostControls: boolean;
};

export function buildTournamentParticipantContext(input: {
  userId: string | null;
  userTeamId: string | null;
  roles: AppRole[];
  tournamentCreatedBy: string | null;
  canManageRuntime?: boolean;
}): TournamentParticipantContext {
  const isAuthenticated = Boolean(input.userId);
  const userTeamId = input.userTeamId;
  const isParticipant = Boolean(userTeamId);
  const isOwnerOrAdmin = input.userId
    ? canManageTournament(input.roles, input.tournamentCreatedBy, input.userId)
    : false;
  const isRuntimeManager = isOwnerOrAdmin || Boolean(input.canManageRuntime);

  return {
    isAuthenticated,
    userId: input.userId,
    userTeamId,
    isHost: isRuntimeManager,
    isParticipant,
    isRuntimeManager,
    canUseCourtsideScoring: isAuthenticated && (isParticipant || isRuntimeManager),
    canUseHostControls: isAuthenticated && isRuntimeManager,
  };
}

export function assertCourtsideScoringAccess(ctx: TournamentParticipantContext): void {
  if (!ctx.isAuthenticated) {
    throw new AppError("Sign in to score matches", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }
  if (!ctx.isParticipant && !ctx.isHost) {
    throw new AppError("Join a team or use a host account to access courtside scoring", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export function assertHostControlsAccess(ctx: TournamentParticipantContext): void {
  if (!ctx.isAuthenticated) {
    throw new AppError("Authentication required", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }
  if (!ctx.isHost) {
    throw new AppError("Only the host can use session controls", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export function canScoreBracketMatch(
  ctx: TournamentParticipantContext,
  match: Pick<BracketMatchView, "teamAId" | "teamBId">,
): boolean {
  if (ctx.isHost) return true;
  if (!ctx.canUseCourtsideScoring) return false;
  if (!ctx.userTeamId) return false;
  return match.teamAId === ctx.userTeamId || match.teamBId === ctx.userTeamId;
}

export function assertCanScoreBracketMatch(
  ctx: TournamentParticipantContext,
  match: Pick<BracketMatchView, "teamAId" | "teamBId">,
): void {
  assertCourtsideScoringAccess(ctx);
  if (!canScoreBracketMatch(ctx, match)) {
    throw new AppError("You can only score matches your squad is playing in", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
