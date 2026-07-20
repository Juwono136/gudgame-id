import { jsonError, jsonSuccess } from "@/lib/api/response";
import { guardApiRequest } from "@/lib/api/guard-request";
import { AppError } from "@/lib/errors";
import { withCache } from "@/lib/cache/redis-cache";
import {
  TOURNAMENT_CACHE_PREFIX,
  TOURNAMENT_LIVE_CACHE_TTL_SECONDS,
  tournamentLiveCacheKey,
} from "@/lib/tournaments/cache";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { buildTournamentLivePayload } from "@/lib/tournaments/live/build-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    await guardApiRequest(request, { tier: "general", skipOriginCheck: true });

    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const payload = await withCache(
      tournamentLiveCacheKey(sportSlug, slug),
      () => buildTournamentLivePayload(tournament),
      {
        prefix: TOURNAMENT_CACHE_PREFIX,
        ttlSeconds: TOURNAMENT_LIVE_CACHE_TTL_SECONDS,
      },
    );

    return jsonSuccess(payload);
  } catch (error) {
    return jsonError(error);
  }
}
