import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { queryPaymentTransactions } from "@/lib/tournaments/payments/transactions-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireHostDashboardAccess();
    const url = new URL(request.url);

    const result = await queryPaymentTransactions({
      scope: "host",
      userId: ctx.userId,
      limit: Number(url.searchParams.get("limit") ?? "20"),
      offset: Number(url.searchParams.get("offset") ?? "0"),
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      tournamentId: url.searchParams.get("tournamentId")
        ? parseEntityIdParam(url.searchParams.get("tournamentId")!, "tournament id")
        : undefined,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
