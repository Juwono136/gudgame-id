import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { dashboardRoutes } from "@/lib/constants/routes";
import { getDefaultDashboardUrl } from "@/lib/roles/route-access";

export const metadata = {
  title: "My Settings",
};

export default async function SettingsPage() {
  const { roles } = await requireAccountSettingsAccess();
  const session = await getServerSession();
  if (!session?.user) return null;
  const backHref = getDefaultDashboardUrl(roles);
  const workspaceVariant =
    roles.includes("host") || roles.includes("super_admin")
      ? ("host" as const)
      : ("player" as const);
  const playerBackHref = dashboardRoutes.home;

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading settings…" />
          </div>
        }
      >
        <SettingsPageClient
          backHref={roles.includes("player") ? playerBackHref : backHref}
          email={session.user.email}
          roles={roles}
          workspaceVariant={roles.includes("player") ? "player" : workspaceVariant}
        />
      </Suspense>
    </PageShell>
  );
}
