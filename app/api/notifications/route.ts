import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
} from "@/lib/notifications/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const search = url.searchParams.get("search") ?? undefined;

    const result = await listNotificationsForUser(userId, { limit, offset, search });
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH() {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const count = await markAllNotificationsRead(userId);
    return jsonSuccess({ marked: count });
  } catch (error) {
    return jsonError(error);
  }
}
