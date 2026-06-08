import { redirect } from "next/navigation";
import { UserManagementPage } from "@/components/admin/users/user-management-page";
import { getAdminSessionContext } from "@/lib/admin/session";
import { adminRoutes } from "@/lib/constants/routes";
import { canManageUsers } from "@/lib/roles/permissions";

export default async function AdminUsersPage() {
  const ctx = await getAdminSessionContext();
  if (!ctx) redirect(`${adminRoutes.home}?error=access_denied`);
  if (!canManageUsers(ctx.roles)) {
    redirect(`${adminRoutes.home}?error=users_forbidden`);
  }
  return <UserManagementPage context={ctx} />;
}
