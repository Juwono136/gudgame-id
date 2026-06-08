import { getAdminSessionContext } from "@/lib/admin/session";
import { AdminOverview } from "@/components/admin/dashboard/admin-overview";
import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/constants/routes";

export default async function AdminHomePage() {
  const ctx = await getAdminSessionContext();
  if (!ctx) redirect(`${adminRoutes.home}?error=access_denied`);
  return <AdminOverview context={ctx} />;
}
