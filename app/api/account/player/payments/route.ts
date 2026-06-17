import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { queryPaymentTransactions } from "@/lib/tournaments/payments/transactions-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requirePlayerDashboardAccess();
    const url = new URL(request.url);

    const result = await queryPaymentTransactions({
      scope: "player",
      userId,
      limit: Number(url.searchParams.get("limit") ?? "20"),
      offset: Number(url.searchParams.get("offset") ?? "0"),
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
