import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { markNotificationRead } from "@/lib/notifications/service";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const notificationId = Number(id);
    if (!Number.isFinite(notificationId)) {
      return jsonError(new Error("Invalid notification id"));
    }

    const ok = await markNotificationRead(userId, notificationId);
    return jsonSuccess({ ok });
  } catch (error) {
    return jsonError(error);
  }
}
