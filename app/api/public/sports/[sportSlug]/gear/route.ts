import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getSportBySlug } from "@/lib/wiki/public";
import { listPublishedGearPaginated } from "@/lib/wiki/public-gear";
import { publicGearListQuerySchema } from "@/lib/validations/public-wiki";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string }> },
) {
  try {
    const { sportSlug } = await params;
    const sport = await getSportBySlug(sportSlug);
    if (!sport || sport.visibility !== "live") {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const url = new URL(request.url);
    const parsed = publicGearListQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new AppError("Invalid query parameters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const list = await listPublishedGearPaginated(sportSlug, parsed.data);
    return jsonSuccess(list);
  } catch (error) {
    return jsonError(error);
  }
}
