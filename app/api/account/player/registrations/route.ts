import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { listPlayerRegistrations } from "@/lib/tournaments/payments/player-history";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await requirePlayerDashboardAccess();
    const items = await listPlayerRegistrations(userId);
    return jsonSuccess({ items });
  } catch (error) {
    return jsonError(error);
  }
}
