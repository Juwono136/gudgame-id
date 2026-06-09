import { SportsManagementPage } from "@/components/admin/sports/sports-management-page";
import { requireAdminSession } from "@/lib/admin/session";
import { hasPermission } from "@/lib/roles/permissions";
import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Sports Management",
};

export default async function AdminSportsPage() {
  const context = await requireAdminSession();
  if (!hasPermission(context.roles, "admin.sports.manage")) {
    redirect(adminRoutes.home);
  }

  return <SportsManagementPage context={context} />;
}
