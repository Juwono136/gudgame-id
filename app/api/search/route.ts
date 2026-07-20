import { jsonError, jsonSuccess } from "@/lib/api/response";
import { guardApiRequest } from "@/lib/api/guard-request";
import { AppError } from "@/lib/errors";
import { globalSearchQuerySchema } from "@/lib/validations/global-search";
import { searchGlobally } from "@/lib/wiki/global-search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await guardApiRequest(request, { tier: "general", skipOriginCheck: true });

    const url = new URL(request.url);
    const parsed = globalSearchQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!parsed.success) {
      throw new AppError("Invalid search query", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const data = await searchGlobally({
      query: parsed.data.q,
      sportSlug: parsed.data.sportSlug,
      limitPerType: parsed.data.limit,
    });

    return jsonSuccess(data);
  } catch (error) {
    return jsonError(error);
  }
}
