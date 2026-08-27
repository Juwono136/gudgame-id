import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { searchPartnerPlayersForRegistration } from "@/lib/partners/registration/search-players";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(12),
  exclude: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
    ),
});

/**
 * Public (rate-limited) partner-scoped player search for tournament registration.
 * Does not touch Gud Game users — only partner_players for this partnerSlug.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "general",
      keySuffix: "partner-player-search",
    });

    const { partnerSlug: raw } = await params;
    const slug = normalizePartnerSlug(raw);
    const partner = await getActivePartnerBySlug(slug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: url.searchParams.get("q"),
      limit: url.searchParams.get("limit") ?? undefined,
      exclude: url.searchParams.get("exclude") ?? undefined,
    });

    if (!parsed.success) {
      throw new AppError("Invalid search query", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const results = await searchPartnerPlayersForRegistration(partner.id, parsed.data.q, {
      limit: parsed.data.limit,
      excludePlayerIds: parsed.data.exclude,
    });

    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      results,
    });
  } catch (error) {
    return jsonError(error);
  }
}
