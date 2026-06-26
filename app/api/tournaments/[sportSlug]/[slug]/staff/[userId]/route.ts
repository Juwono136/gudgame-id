import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { removeOfficialTournamentStaff } from "@/lib/tournaments/official-staff-service";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string; userId: string }> },
) {
  try {
    const { userId: actorUserId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug, userId } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const staff = await removeOfficialTournamentStaff({
      tournament,
      actorUserId,
      roles,
      staffUserId: userId,
    });

    return jsonSuccess({ staff });
  } catch (error) {
    return jsonError(error);
  }
}
