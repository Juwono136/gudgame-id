import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireUserManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import { approveHostRoleRequest } from "@/lib/host-role-requests/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const ctx = await requireUserManagementAccess();
    await guardApiRequest(request, { tier: "admin", keySuffix: ctx.userId });

    const { id } = await context.params;
    if (!id?.trim()) {
      throw new AppError("Request id is required.", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const updated = await approveHostRoleRequest(id.trim(), ctx.userId);
    return jsonSuccess({ request: updated });
  } catch (error) {
    return jsonError(error);
  }
}
