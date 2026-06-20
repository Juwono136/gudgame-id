import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { searchPublishedGear } from "@/lib/wiki/gear/search";
import { getSportBySlug } from "@/lib/wiki/public";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  sportSlug: z.string().trim().min(1).max(50),
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(25).default(15),
});

export async function GET(request: Request) {
  try {
    await requireApiRoleGuardContext();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      throw new AppError("Invalid query parameters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const sport = await getSportBySlug(parsed.data.sportSlug);
    if (!sport || sport.visibility !== "live") {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const items = await searchPublishedGear({
      sportId: sport.id,
      query: parsed.data.q,
      limit: parsed.data.limit,
    });

    return jsonSuccess({ items });
  } catch (error) {
    return jsonError(error);
  }
}
