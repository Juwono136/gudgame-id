import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentArchiveByTournamentId } from "@/lib/tournaments/archives/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;

    const archive = await getTournamentArchiveByTournamentId(id, userId);
    if (!archive) {
      throw new AppError("Archive not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    return jsonSuccess({ archive });
  } catch (error) {
    return jsonError(error);
  }
}
