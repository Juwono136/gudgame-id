import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireUserManagementAccess } from "@/lib/admin/session";
import { getAdminUserStats } from "@/lib/admin/users/service";

export async function GET() {
  try {
    await requireUserManagementAccess();
    const stats = await getAdminUserStats();
    return jsonSuccess(stats);
  } catch (error) {
    return jsonError(error);
  }
}
