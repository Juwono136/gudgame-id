import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";
import { queryPaymentTransactions } from "@/lib/tournaments/payments/transactions-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const url = new URL(request.url);

    const result = await queryPaymentTransactions({
      scope: "partner",
      userId: ctx.userId,
      partnerId: partner.id,
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
