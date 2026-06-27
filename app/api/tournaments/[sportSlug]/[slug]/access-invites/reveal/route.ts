import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { revealAccessInviteCredentials } from "@/lib/tournaments/invitations/access-grants";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  inviteId: z.string().uuid(),
});

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
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid invite payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const credentials = await revealAccessInviteCredentials({
      tournamentId: tournament.id,
      inviteId: parsed.data.inviteId,
      sportSlug: tournament.sportSlug,
      slug: tournament.slug,
    });

    return jsonSuccess({ credentials });
  } catch (error) {
    return jsonError(error);
  }
}
