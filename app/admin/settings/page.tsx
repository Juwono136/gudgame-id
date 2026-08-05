import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminHomepageSettingsPage } from "@/components/admin/settings/admin-homepage-settings-page";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAdminSessionContext } from "@/lib/admin/session";
import { adminRoutes } from "@/lib/constants/routes";
import { canManageUsers } from "@/lib/roles/permissions";
import { getHomepageSettings } from "@/lib/site/homepage-settings";

export const metadata = {
  title: "System Settings",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSystemSettingsPage() {
  const context = await getAdminSessionContext();
  if (!context) redirect(`${adminRoutes.home}?error=access_denied`);
  if (!canManageUsers(context.roles)) {
    redirect(`${adminRoutes.home}?error=access_denied`);
  }

  const initialSettings = await getHomepageSettings();

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <LoadingSpinner label="Loading system settings…" />
        </div>
      }
    >
      <AdminHomepageSettingsPage context={context} initialSettings={initialSettings} />
    </Suspense>
  );
}
