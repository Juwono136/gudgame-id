import { eq } from "drizzle-orm";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getUserAuthProvidersByUserId } from "@/lib/auth/account-providers";
import { getUserAccountStatusById } from "@/lib/auth/account-status";
import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";
import { getServerSession } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
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
        profileComplete: true,
        profileCompletionPercent: 100,
        missingProfileFields: [],
        isGoogleOnly: false,
        hasGoogle: false,
      });
    }

    const account = await getUserAccountStatusById(session.user.id);

    if (!account) {
      return jsonSuccess({
        authenticated: false,
        accountInactive: false,
        staleSession: true,
        roles: [],
        roleLabels: [],
        dashboardLinks: [],
        canAccessAdmin: false,
        mustChangePassword: false,
        profileComplete: true,
        profileCompletionPercent: 100,
        missingProfileFields: [],
        isGoogleOnly: false,
        hasGoogle: false,
      });
    }

    if (!account.isActive) {
      return jsonSuccess({
        authenticated: false,
        accountInactive: true,
        roles: [],
        roleLabels: [],
        dashboardLinks: [],
        canAccessAdmin: false,
        mustChangePassword: false,
        profileComplete: true,
        profileCompletionPercent: 100,
        missingProfileFields: [],
        isGoogleOnly: false,
        hasGoogle: false,
      });
    }

    const roles = await getUserRoleAssignments(session.user.id);

    const [dbUser] = await getDb()
      .select({
        id: user.id,
        fullNameKtp: user.fullNameKtp,
        phone: user.phone,
        phoneCountryCode: user.phoneCountryCode,
        sportInterestSlugs: user.sportInterestSlugs,
        gender: user.gender,
        image: user.image,
        imageStorageKey: user.imageStorageKey,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const profileStatus = dbUser
      ? getProfileCompletionStatus(dbUser)
      : { isComplete: true, missingFields: [], completionPercent: 100 };

    const providers = await getUserAuthProvidersByUserId(session.user.id);

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
      profileComplete: profileStatus.isComplete,
      profileCompletionPercent: profileStatus.completionPercent,
      missingProfileFields: profileStatus.missingFields,
      isGoogleOnly: providers.isGoogleOnly,
      hasGoogle: providers.hasGoogle,
    });
  } catch (error) {
    return jsonError(error);
  }
}
