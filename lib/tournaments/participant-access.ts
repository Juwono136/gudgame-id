import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import {
  canAccessTournamentManagePage,
  canManageLiveScoring,
  isTournamentOwner,
} from "@/lib/tournaments/permissions";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";

export type TournamentParticipantContext = {
  isAuthenticated: boolean;
  userId: string | null;
  userTeamId: string | null;
  /** Tournament creator — edit settings, invites, registrations. */
  isOwner: boolean;
  /** Owner or invited staff — may open the manage workspace. */
  canAccessManagePage: boolean;
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
  tournament?: Pick<{ createdBy: string | null }, "createdBy">;
  /** @deprecated Pass tournament instead */
  tournamentCreatedBy?: string | null;
  grantRole?: string | null;
}): TournamentParticipantContext {
  const createdBy = input.tournament?.createdBy ?? input.tournamentCreatedBy ?? null;
  const tournamentStub = { createdBy } as import("@/lib/tournaments/service").TournamentDetail;
  const isAuthenticated = Boolean(input.userId);
  const userTeamId = input.userTeamId;
  const isParticipant = Boolean(userTeamId);
  const isOwner = input.userId
    ? isTournamentOwner(createdBy, input.userId)
    : false;
  const canAccessManagePage = input.userId
    ? canAccessTournamentManagePage(createdBy, input.userId, input.grantRole)
    : false;
  const isRuntimeManager = input.userId
    ? canManageLiveScoring(input.roles, tournamentStub, input.userId, input.grantRole)
    : false;

  return {
    isAuthenticated,
    userId: input.userId,
    userTeamId,
    isOwner,
    canAccessManagePage,
    isHost: isRuntimeManager,
    isParticipant,
    isRuntimeManager,
    canUseCourtsideScoring: isAuthenticated && isRuntimeManager,
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
  if (!ctx.isRuntimeManager) {
    throw new AppError("Only the tournament owner or invited staff can score matches", {
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
    throw new AppError("Only the tournament owner or invited staff can use session controls", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export function canScoreBracketMatch(
  ctx: TournamentParticipantContext,
  _match: Pick<BracketMatchView, "teamAId" | "teamBId">,
): boolean {
  return ctx.isRuntimeManager;
}

export function assertCanScoreBracketMatch(
  ctx: TournamentParticipantContext,
  match: Pick<BracketMatchView, "teamAId" | "teamBId">,
): void {
  assertCourtsideScoringAccess(ctx);
  if (!canScoreBracketMatch(ctx, match)) {
    throw new AppError("You do not have permission to score this match", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
