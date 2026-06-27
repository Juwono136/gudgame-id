import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { queryTournamentParticipants } from "@/lib/tournaments/participants/query";
import { normalizeTournamentType } from "@/lib/tournaments/core/types";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20"), 1), 50);

    const result = await queryTournamentParticipants({
      tournamentId: tournament.id,
      sportId: tournament.sportId,
      sportSlug: tournament.sportSlug,
      tournamentType: normalizeTournamentType(tournament.tournamentType),
      page,
      pageSize,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
