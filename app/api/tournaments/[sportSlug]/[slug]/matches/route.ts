import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { listReclubMatchesPaginated } from "@/lib/tournaments/reclub/matches";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["all", "completed", "in_progress"]).default("all"),
});

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

    if (tournament.tournamentType !== "recreational") {
      throw new AppError("Match history is only available for reclub sessions", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new AppError("Invalid query", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const result = await listReclubMatchesPaginated(tournament.id, parsed.data);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
