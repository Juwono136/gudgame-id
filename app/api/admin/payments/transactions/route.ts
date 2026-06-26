import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { queryPaymentTransactions } from "@/lib/tournaments/payments/transactions-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const url = new URL(request.url);

    const result = await queryPaymentTransactions({
      scope: "admin",
      userId: ctx.userId,
      limit: Number(url.searchParams.get("limit") ?? "20"),
      offset: Number(url.searchParams.get("offset") ?? "0"),
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      tournamentId: url.searchParams.get("tournamentId")
        ? parseEntityIdParam(url.searchParams.get("tournamentId")!, "tournament id")
        : undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
