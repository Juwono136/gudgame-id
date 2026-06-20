import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { clampPaginationParams } from "@/lib/pagination/constants";
import { queryPaymentTransactions } from "@/lib/tournaments/payments/transactions-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requirePlayerDashboardAccess();
    const url = new URL(request.url);
    const { limit, offset } = clampPaginationParams(
      Number(url.searchParams.get("limit") ?? "20"),
      Number(url.searchParams.get("offset") ?? "0"),
    );

    const result = await queryPaymentTransactions({
      scope: "player",
      userId,
      limit,
      offset,
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
