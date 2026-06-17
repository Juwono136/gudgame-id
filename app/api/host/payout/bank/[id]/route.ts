import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
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
    const ctx = await requireHostDashboardAccess();
    const accountId = Number((await params).id);
    if (!Number.isFinite(accountId)) {
      throw new AppError("Invalid account id", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const body = await request.json();
    const parsed = updateBankAccountSchema.safeParse({ ...body, id: accountId });
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
    const ctx = await requireHostDashboardAccess();
    const accountId = Number((await params).id);
    if (!Number.isFinite(accountId)) {
      throw new AppError("Invalid account id", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const profile = await deleteHostBankAccount(ctx.userId, accountId);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
