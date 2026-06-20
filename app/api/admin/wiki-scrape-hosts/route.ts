import { jsonError, jsonSuccess } from "@/lib/api/response";
import { parseRequestJson } from "@/lib/api/parse-request-json";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import {
  createScrapeHost,
  createHostSchema,
  listScrapeHosts,
} from "@/lib/wiki/scrape-hosts/service";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireWikiManagementAccess();
    const hosts = await listScrapeHosts(ctx.sportId);
    return jsonSuccess({ hosts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = (await parseRequestJson(request)) as Record<string, unknown>;
    const parsed = createHostSchema.safeParse({
      ...body,
      sportId: ctx.sportId,
    });
    if (!parsed.success) {
      throw new AppError("Invalid scrape host", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const host = await createScrapeHost(parsed.data, ctx.userId);
    return jsonSuccess({ host });
  } catch (error) {
    return jsonError(error);
  }
}
