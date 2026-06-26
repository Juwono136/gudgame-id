import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserAccountStatusById } from "@/lib/auth/account-status";
import { auth } from "@/lib/auth/server";
import { authRoutes } from "@/lib/constants/routes";
import { getDefaultDashboardUrl } from "@/lib/roles/route-access";
import { getUserRoleAssignments } from "@/lib/roles/sync";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession(redirectTo = authRoutes.login) {
  const session = await getServerSession();
  if (!session) {
    const loginUrl =
      redirectTo === authRoutes.login
        ? `${authRoutes.login}?reason=session_expired`
        : redirectTo;
    redirect(loginUrl);
  }
  return session;
}

export async function signOutCurrentSession(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
}

export async function redirectIfAuthenticated(callbackUrl?: string | null) {
  const session = await getServerSession();
  if (!session?.user) return;

  const account = await getUserAccountStatusById(session.user.id);
  if (!account?.isActive) return;

  if (account.mustChangePassword) {
    redirect(authRoutes.changePasswordRequired);
  }

  const roles = await getUserRoleAssignments(session.user.id);
  const { resolveSafeCallbackUrl } = await import("@/lib/roles/route-access");
  redirect(resolveSafeCallbackUrl(callbackUrl, roles));
}
