import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { canManageTournament } from "@/lib/tournaments/permissions";
import {
  createAccessInvite,
  listAccessInvites,
  revokeAccessInvite,
} from "@/lib/tournaments/invitations/access-grants";
import { accessInviteCreateSchema } from "@/lib/validations/tournaments";

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
      throw new AppError("Only the tournament organizer can manage staff invites.", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const invites = await listAccessInvites(tournament);
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
    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Only the tournament organizer can manage staff invites.", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const body = await request.json();
    const parsed = accessInviteCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid invite payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const invite = await createAccessInvite({
      tournament,
      invitedByUserId: userId,
      role: parsed.data.role,
      email: parsed.data.email,
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
      throw new AppError("Only the tournament organizer can manage staff invites.", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const url = new URL(request.url);
    const inviteId = url.searchParams.get("inviteId");
    if (!inviteId) {
      throw new AppError("inviteId is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    await revokeAccessInvite({ tournamentId: tournament.id, inviteId });
    return jsonSuccess({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
