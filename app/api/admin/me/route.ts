import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminSessionContext } from "@/lib/admin/session";

export async function GET() {
  try {
    const ctx = await getAdminSessionContext();
    if (!ctx) {
      return jsonSuccess({
        canAccessAdmin: false,
        roles: [],
        activeRole: null,
        permissions: [],
      });
    }

    return jsonSuccess({
      canAccessAdmin: true,
      roles: ctx.roles,
      activeRole: ctx.activeRole,
      permissions: [...ctx.permissions],
      sportSlug: ctx.sportSlug,
    });
  } catch (error) {
    return jsonError(error);
  }
}
