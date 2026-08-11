import { redirect } from "next/navigation";
import { HostRoleRequestsPage } from "@/components/admin/host-requests/host-role-requests-page";
import { getAdminSessionContext } from "@/lib/admin/session";
import { adminRoutes } from "@/lib/constants/routes";
import { canManageUsers } from "@/lib/roles/permissions";

export const metadata = {
  title: "Host requests",
};

export default async function AdminHostRequestsPage() {
  const ctx = await getAdminSessionContext();
  if (!ctx) redirect(`${adminRoutes.home}?error=access_denied`);
  if (!canManageUsers(ctx.roles)) {
    redirect(`${adminRoutes.home}?error=users_forbidden`);
  }
  return <HostRoleRequestsPage context={ctx} />;
}
