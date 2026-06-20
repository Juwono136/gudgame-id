import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiHostDashboardAccess } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { setPrimaryHostBankAccount } from "@/lib/payments/host-payout/accounts";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiHostDashboardAccess();
    const accountId = parseEntityIdParam((await params).id, "account id");

    const profile = await setPrimaryHostBankAccount(ctx.userId, accountId);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
