import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentArchiveReportForOwner } from "@/lib/tournaments/archives/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;

    if (!id?.trim()) {
      throw new AppError("Tournament id is required", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const archive = await getTournamentArchiveReportForOwner(id, userId);

    return jsonSuccess({
      archive: {
        id: archive.id,
        tournamentId: archive.tournamentId,
        statsTier: archive.statsTier,
        archivedAt: archive.archivedAt.toISOString(),
        report: archive.report,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
