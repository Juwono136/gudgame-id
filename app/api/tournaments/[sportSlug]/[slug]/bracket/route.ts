import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { listBracketMatches, hasBracket } from "@/lib/tournaments/brackets/service";
import { buildTournamentLeaderboard } from "@/lib/tournaments/brackets/leaderboard";
import { shouldExposeBracketPublicData } from "@/lib/tournaments/lifecycle-guards";
import { isBracketSeedingFinalized } from "@/lib/tournaments/settings";

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

    if (!shouldExposeBracketPublicData(tournament)) {
      return jsonSuccess({ matches: [], leaderboard: [], generated: false, seedingFinalized: false });
    }

    const bracketExists = await hasBracket(tournament.id);
    if (!bracketExists) {
      return jsonSuccess({ matches: [], leaderboard: [], generated: false, seedingFinalized: false });
    }

    const [matches, leaderboard] = await Promise.all([
      listBracketMatches(tournament.id),
      buildTournamentLeaderboard(tournament.id),
    ]);

    const seedingFinalized = isBracketSeedingFinalized(tournament);

    return jsonSuccess({
      matches,
      leaderboard,
      generated: true,
      seedingFinalized,
    });
  } catch (error) {
    return jsonError(error);
  }
}
