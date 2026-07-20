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

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return jsonSuccess({
        authenticated: false,
        user: null,
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
        user: null,
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
        user: null,
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

    const [roles, dbUserRows, providers] = await Promise.all([
      getUserRoleAssignments(session.user.id),
      getDb()
        .select({
          id: user.id,
          name: user.name,
          fullNameKtp: user.fullNameKtp,
          phone: user.phone,
          phoneCountryCode: user.phoneCountryCode,
          sportInterestSlugs: user.sportInterestSlugs,
          gender: user.gender,
          image: user.image,
          imageStorageKey: user.imageStorageKey,
          nickname: user.nickname,
        })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1),
      getUserAuthProvidersByUserId(session.user.id),
    ]);

    const dbUser = dbUserRows[0];
    const profileStatus = dbUser
      ? getProfileCompletionStatus(dbUser)
      : { isComplete: true, missingFields: [], completionPercent: 100 };

    return jsonSuccess({
      authenticated: true,
      user: {
        id: session.user.id,
        name: dbUser?.name?.trim() || session.user.name,
        email: session.user.email,
        image: dbUser?.image ?? session.user.image ?? null,
        nickname: dbUser?.nickname ?? null,
        role: (session.user as { role?: string | null }).role ?? null,
      },
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
