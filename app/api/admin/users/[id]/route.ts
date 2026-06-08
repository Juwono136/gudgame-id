import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  assertNotSelfTarget,
  requireUserManagementAccess,
} from "@/lib/admin/session";
import {
  deleteAdminUser,
  getAdminUserById,
  updateAdminUserStaff,
} from "@/lib/admin/users/service";
import { AppError } from "@/lib/errors";
import { adminEditStaffUserSchema } from "@/lib/validations/admin-users";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireUserManagementAccess();
    const { id } = await context.params;
    const user = await getAdminUserById(id);
    if (!user) {
      throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    return jsonSuccess(user);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const ctx = await requireUserManagementAccess();
    const { id } = await context.params;
    const body = adminEditStaffUserSchema.parse(await request.json());

    if (body.roles.includes("super_admin") && !ctx.roles.includes("super_admin")) {
      throw new AppError("Only super admins can assign the super admin role", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const user = await updateAdminUserStaff(id, body, ctx.userId);
    return jsonSuccess(user);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const ctx = await requireUserManagementAccess();
    const { id } = await context.params;
    assertNotSelfTarget(ctx.userId, id, "delete");
    await deleteAdminUser(id);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
