import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiHostDashboardAccess } from "@/lib/auth/role-guard";
import { listHostDisbursements } from "@/lib/payments/host-payout/disbursement/queries";
import { clampPaginationParams } from "@/lib/pagination/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiHostDashboardAccess();
    const { searchParams } = new URL(request.url);
    const { limit, offset } = clampPaginationParams(
      Number(searchParams.get("limit") ?? "20"),
      Number(searchParams.get("offset") ?? "0"),
      50,
    );

    const result = await listHostDisbursements(ctx.userId, { limit, offset });
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
