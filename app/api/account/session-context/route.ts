import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getUserAccountStatusById } from "@/lib/auth/account-status";
import { getServerSession } from "@/lib/auth/session";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { getRoleLabel } from "@/lib/roles/constants";
import {
  getDashboardLinksForRoles,
  userCanAccessAdmin,
} from "@/lib/roles/dashboard-links";
import { getPermissionsForRoles } from "@/lib/roles/permissions";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return jsonSuccess({
        authenticated: false,
        accountInactive: false,
        roles: [],
        roleLabels: [],
        dashboardLinks: [],
        canAccessAdmin: false,
        mustChangePassword: false,
      });
    }

    const account = await getUserAccountStatusById(session.user.id);

    if (!account?.isActive) {
      return jsonSuccess({
        authenticated: false,
        accountInactive: true,
        roles: [],
        roleLabels: [],
        dashboardLinks: [],
        canAccessAdmin: false,
        mustChangePassword: false,
      });
    }

    const roles = await getUserRoleAssignments(session.user.id);

    return jsonSuccess({
      authenticated: true,
      accountInactive: false,
      roles,
      roleLabels: roles.map(getRoleLabel),
      dashboardLinks: getDashboardLinksForRoles(roles).map(
        ({ role, label, href }) => ({ role, label, href }),
      ),
      canAccessAdmin: userCanAccessAdmin(roles),
      permissions: [...getPermissionsForRoles(roles)],
      mustChangePassword: account.mustChangePassword,
    });
  } catch (error) {
    return jsonError(error);
  }
}
