import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireUserManagementAccess } from "@/lib/admin/session";
import {
  getHostRoleRequestStatusCounts,
  listHostRoleRequestsForAdmin,
} from "@/lib/host-role-requests/service";
import { reconcileApprovedHostRequestsWithoutRole } from "@/lib/host-role-requests/sync-with-roles";
import { listHostRoleRequestsQuerySchema } from "@/lib/validations/host-role-request";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireUserManagementAccess();
    await guardApiRequest(request, { tier: "admin" });

    const url = new URL(request.url);
    const parsed = listHostRoleRequestsQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    if (!parsed.success) throw zodErrorToAppError(parsed.error);

    // Heal any approved rows whose Host role was removed outside this page.
    await reconcileApprovedHostRequestsWithoutRole();

    const [list, statusCounts] = await Promise.all([
      listHostRoleRequestsForAdmin(parsed.data),
      getHostRoleRequestStatusCounts(),
    ]);

    return jsonSuccess({
      items: list.items,
      total: list.total,
      page: list.page,
      pageSize: list.pageSize,
      totalPages: list.totalPages,
      pendingCount: statusCounts.pending,
      statusCounts,
    });
  } catch (error) {
    return jsonError(error);
  }
}
