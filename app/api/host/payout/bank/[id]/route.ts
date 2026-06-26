import { jsonError, jsonSuccess } from "@/lib/api/response";
import { parseRequestJson } from "@/lib/api/parse-request-json";
import { requireApiHostDashboardAccess } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import {
  deleteHostBankAccount,
  updateHostBankAccount,
} from "@/lib/payments/host-payout/accounts";
import { updateBankAccountSchema } from "@/lib/payments/host-payout/schemas";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiHostDashboardAccess();
    const accountId = parseEntityIdParam((await params).id, "account id");

    const body = await parseRequestJson(request);
    const parsed = updateBankAccountSchema.safeParse({
      ...(typeof body === "object" && body !== null ? body : {}),
      id: accountId,
    });
    if (!parsed.success) {
      throw new AppError("Invalid bank account details", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const profile = await updateHostBankAccount(ctx.userId, parsed.data);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiHostDashboardAccess();
    const accountId = parseEntityIdParam((await params).id, "account id");

    const profile = await deleteHostBankAccount(ctx.userId, accountId);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
