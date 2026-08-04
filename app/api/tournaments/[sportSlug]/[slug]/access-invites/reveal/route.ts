import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { resolvePartnerSlugForTournament } from "@/lib/partners/resolve-slug";
import { revealAccessInviteCredentials } from "@/lib/tournaments/invitations/access-grants";
import { assertCanManageStaffInvites } from "@/lib/tournaments/manage-access";
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
    await assertCanManageStaffInvites(tournament, userId, roles);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid invite payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const partnerSlug = await resolvePartnerSlugForTournament(tournament.partnerId);
    const credentials = await revealAccessInviteCredentials({
      tournamentId: tournament.id,
      inviteId: parsed.data.inviteId,
      sportSlug: tournament.sportSlug,
      slug: tournament.slug,
      partnerSlug,
    });

    return jsonSuccess({ credentials });
  } catch (error) {
    return jsonError(error);
  }
}
