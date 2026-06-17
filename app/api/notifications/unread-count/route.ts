import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { countUnreadNotifications } from "@/lib/notifications/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const count = await countUnreadNotifications(userId);
    return jsonSuccess({ count });
  } catch (error) {
    return jsonError(error);
  }
}
