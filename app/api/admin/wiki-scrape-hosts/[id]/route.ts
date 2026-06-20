import { jsonError, jsonSuccess } from "@/lib/api/response";
import { parseRequestJson } from "@/lib/api/parse-request-json";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import {
  deleteScrapeHost,
  updateHostSchema,
  updateScrapeHost,
} from "@/lib/wiki/scrape-hosts/service";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireWikiManagementAccess();
    const { id } = await context.params;
    const body = await parseRequestJson(request);
    const parsed = updateHostSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid scrape host update", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const host = await updateScrapeHost(id, parsed.data);
    return jsonSuccess({ host });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireWikiManagementAccess();
    const { id } = await context.params;
    await deleteScrapeHost(id);
    return jsonSuccess({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
