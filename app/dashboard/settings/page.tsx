import { PageShell } from "@/components/layout/page-shell";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { getDefaultDashboardUrl } from "@/lib/roles/route-access";

export const metadata = {
  title: "My Settings",
};

export default async function SettingsPage() {
  const { roles } = await requireAccountSettingsAccess();
  const session = await getServerSession();
  if (!session?.user) return null;
  const backHref = getDefaultDashboardUrl(roles);

  return (
    <PageShell>
      <SettingsPageClient backHref={backHref} email={session.user.email} />
    </PageShell>
  );
}
