import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { queryTournamentParticipants } from "@/lib/tournaments/participants/query";
import { ensurePlayerWikiProfilesForTournament } from "@/lib/account/player-profile/ensure-tournament-sport";
import { normalizeTournamentType } from "@/lib/tournaments/core/types";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { sanitizeSearchTerm } from "@/lib/search/sanitize-search-term";

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
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1),
      50,
    );
    const search = sanitizeSearchTerm(url.searchParams.get("search"));

    const queryInput = {
      tournamentId: tournament.id,
      sportId: tournament.sportId,
      sportSlug: tournament.sportSlug,
      tournamentType: normalizeTournamentType(tournament.tournamentType),
      officialBilling: tournament.officialBilling,
      page,
      pageSize,
      search,
    } as const;

    const result = await queryTournamentParticipants(queryInput);

    // Partner white-label rosters may include guest players (partnerPlayerId, not a
    // Gud Game userId) — never feed those into Gud Game wiki profile provisioning.
    const userIds = tournament.partnerId
      ? []
      : result.items.map((row) => row.userId).filter(Boolean);
    if (userIds.length) {
      await ensurePlayerWikiProfilesForTournament(tournament.sportId, userIds);
      const refreshed = await queryTournamentParticipants(queryInput);
      return jsonSuccess(refreshed);
    }

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
