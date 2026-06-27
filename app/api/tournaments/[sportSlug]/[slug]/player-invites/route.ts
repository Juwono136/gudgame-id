import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { canManageTournament } from "@/lib/tournaments/permissions";
import {
  createPlayerInvite,
  listPlayerInvites,
  revokePlayerInvite,
} from "@/lib/tournaments/invitations/player-invites";
import { playerInviteCreateSchema } from "@/lib/validations/tournaments";
import { isFunMatchType } from "@/lib/tournaments/core/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const invites = await listPlayerInvites(tournament);
    return jsonSuccess({ invites });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (!isFunMatchType(tournament.tournamentType)) {
      throw new AppError("Player invites are only for Fun Match tournaments", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }
    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = playerInviteCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid invite payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const invite = await createPlayerInvite({
      tournament,
      invitedByUserId: userId,
      teamId: parsed.data.teamId,
    });

    return jsonSuccess({ invite }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const url = new URL(request.url);
    const inviteId = url.searchParams.get("inviteId");
    if (!inviteId) {
      throw new AppError("inviteId is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    await revokePlayerInvite({ tournamentId: tournament.id, inviteId });
    return jsonSuccess({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
