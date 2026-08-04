import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminDashboardStats } from "@/lib/admin/dashboard/service";
import { requireAdminSession } from "@/lib/admin/session";
import { adminDashboardQuerySchema } from "@/lib/validations/admin-dashboard";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminSession();
    const url = new URL(request.url);
    const parsed = adminDashboardQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!parsed.success) {
      throw zodErrorToAppError(parsed.error);
    }

    const stats = await getAdminDashboardStats(ctx.sportId, ctx.sportSlug, {
      range: parsed.data.range,
      from: parsed.data.from,
      to: parsed.data.to,
    });

    return jsonSuccess(stats);
  } catch (error) {
    return jsonError(error);
  }
}
