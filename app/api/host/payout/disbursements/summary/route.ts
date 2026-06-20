import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiHostDashboardAccess } from "@/lib/auth/role-guard";
import { getHostPayoutSummary } from "@/lib/payments/host-payout/disbursement/summary";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireApiHostDashboardAccess();
    const summary = await getHostPayoutSummary(ctx.userId);
    return jsonSuccess({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
