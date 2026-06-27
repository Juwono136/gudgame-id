import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { getProfileCompletionSnapshotForUser } from "@/lib/auth/profile-completion";
import { getServerSession } from "@/lib/auth/session";
import { dashboardRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Host Settings",
};

export default async function HostSettingsPage() {
  const { roles, userId } = await requireHostDashboardAccess();
  const session = await getServerSession();
  if (!session?.user) return null;

  const profileCompletion = await getProfileCompletionSnapshotForUser(userId);

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
          backHref={dashboardRoutes.host}
          email={session.user.email}
          roles={roles}
          workspaceVariant="host"
          profileCompletion={profileCompletion}
        />
      </Suspense>
    </PageShell>
  );
}
