import { AdminPaymentSettingsPage } from "@/components/admin/settings/admin-payment-settings-page";
import { redirect } from "next/navigation";
import { getAdminSessionContext } from "@/lib/admin/session";
import { adminRoutes } from "@/lib/constants/routes";
import { canManageUsers } from "@/lib/roles/permissions";

export const metadata = {
  title: "Payment settings",
};

export default async function AdminPaymentSettingsRoute() {
  const context = await getAdminSessionContext();
  if (!context) redirect(`${adminRoutes.home}?error=access_denied`);
  if (!canManageUsers(context.roles)) {
    redirect(`${adminRoutes.home}?error=access_denied`);
  }
  return <AdminPaymentSettingsPage context={context} />;
}
