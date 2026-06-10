import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import {
  getHostPayoutProfile,
  refreshHostXenditAccountStatus,
  setupHostXenditAccount,
} from "@/lib/payments/xenplatform/host-account-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await requireHostDashboardAccess();
    const profile = await refreshHostXenditAccountStatus(userId);
    return jsonSuccess(profile);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST() {
  try {
    const { userId } = await requireHostDashboardAccess();
    const profile = await setupHostXenditAccount(userId);
    return jsonSuccess(profile, 201);
  } catch (error) {
    return jsonError(error);
  }
}
