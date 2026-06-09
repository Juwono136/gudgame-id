import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/admin/session";
import { hasPermission } from "@/lib/roles/permissions";
import { reorderSports } from "@/lib/sports/service";
import { AppError } from "@/lib/errors";
import { sportsReorderSchema } from "@/lib/validations/sports-admin";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAdminSession();
    if (!hasPermission(ctx.roles, "admin.sports.manage")) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const body = await request.json();
    const parsed = sportsReorderSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Validation failed", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    await reorderSports(parsed.data.orderedIds);
    return jsonSuccess({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
