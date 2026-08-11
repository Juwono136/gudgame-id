import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireUserManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import { rejectHostRoleRequest } from "@/lib/host-role-requests/service";
import { rejectHostRoleRequestSchema } from "@/lib/validations/host-role-request";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";

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

    const body = await request.json().catch(() => ({}));
    const parsed = rejectHostRoleRequestSchema.safeParse(body);
    if (!parsed.success) throw zodErrorToAppError(parsed.error);

    const updated = await rejectHostRoleRequest(
      id.trim(),
      ctx.userId,
      parsed.data.rejectionReason,
    );
    return jsonSuccess({ request: updated });
  } catch (error) {
    return jsonError(error);
  }
}
