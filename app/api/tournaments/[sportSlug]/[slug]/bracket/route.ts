import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { listBracketMatches, hasBracket } from "@/lib/tournaments/brackets/service";
import { buildTournamentLeaderboard } from "@/lib/tournaments/brackets/leaderboard";
import { shouldExposeLivePublicData } from "@/lib/tournaments/lifecycle-guards";
import { TOURNAMENT_NOT_STARTED_MESSAGE } from "@/lib/tournaments/core/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (tournament.format === "americano") {
      return jsonSuccess({ matches: [], leaderboard: [], generated: false });
    }

    if (!shouldExposeLivePublicData(tournament)) {
      return jsonSuccess({
        matches: [],
        leaderboard: [],
        generated: false,
        message: TOURNAMENT_NOT_STARTED_MESSAGE,
      });
    }

    const bracketExists = await hasBracket(tournament.id);
    if (!bracketExists) {
      return jsonSuccess({ matches: [], leaderboard: [], generated: false });
    }

    const [matches, leaderboard] = await Promise.all([
      listBracketMatches(tournament.id),
      buildTournamentLeaderboard(tournament.id),
    ]);

    return jsonSuccess({ matches, leaderboard, generated: true });
  } catch (error) {
    return jsonError(error);
  }
}
