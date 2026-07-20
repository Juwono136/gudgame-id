import { jsonError, jsonSuccess } from "@/lib/api/response";
import { guardApiRequest } from "@/lib/api/guard-request";
import { AppError } from "@/lib/errors";
import { listPublishedPlayersPaginated, getSportBySlug } from "@/lib/wiki/public";
import { publicPlayersListQuerySchema } from "@/lib/validations/public-wiki";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string }> },
) {
  try {
    await guardApiRequest(request, { tier: "general", skipOriginCheck: true });

    const { sportSlug } = await params;
    const sport = await getSportBySlug(sportSlug);
    if (!sport || sport.visibility !== "live") {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const url = new URL(request.url);
    const parsed = publicPlayersListQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new AppError("Invalid query parameters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const list = await listPublishedPlayersPaginated(sportSlug, parsed.data);
    return jsonSuccess(list);
  } catch (error) {
    return jsonError(error);
  }
}
