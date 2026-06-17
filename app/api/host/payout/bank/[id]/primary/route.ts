import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { setPrimaryHostBankAccount } from "@/lib/payments/host-payout/accounts";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireHostDashboardAccess();
    const accountId = Number((await params).id);
    if (!Number.isFinite(accountId)) {
      throw new AppError("Invalid account id", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const profile = await setPrimaryHostBankAccount(ctx.userId, accountId);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
