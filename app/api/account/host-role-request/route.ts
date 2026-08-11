import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import {
  cancelHostRoleRequest,
  createHostRoleRequest,
  getAccountHostRoleRequestState,
} from "@/lib/host-role-requests/service";
import { createHostRoleRequestSchema } from "@/lib/validations/host-role-request";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await guardApiRequest(request, { tier: "general" });
    const { userId } = await requireApiRoleGuardContext();
    const state = await getAccountHostRoleRequestState(userId);
    return jsonSuccess(state);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    await guardApiRequest(request, { tier: "sensitive", keySuffix: userId });

    const body = await request.json().catch(() => ({}));
    const parsed = createHostRoleRequestSchema.safeParse(body);
    if (!parsed.success) throw zodErrorToAppError(parsed.error);

    const created = await createHostRoleRequest(userId, parsed.data.message ?? "");
    return jsonSuccess({ request: created }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    await guardApiRequest(request, { tier: "sensitive", keySuffix: userId });

    const cancelled = await cancelHostRoleRequest(userId);
    return jsonSuccess({ request: cancelled });
  } catch (error) {
    return jsonError(error);
  }
}
