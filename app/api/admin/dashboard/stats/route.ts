import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminDashboardStats } from "@/lib/admin/dashboard/service";
import { requireAdminSession } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import { adminDashboardQuerySchema } from "@/lib/validations/admin-dashboard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminSession();
    const url = new URL(request.url);
    const parsed = adminDashboardQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!parsed.success) {
      throw new AppError("Invalid query parameters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const stats = await getAdminDashboardStats(
      ctx.sportId,
      ctx.sportSlug,
      parsed.data.range,
    );

    return jsonSuccess(stats);
  } catch (error) {
    return jsonError(error);
  }
}
