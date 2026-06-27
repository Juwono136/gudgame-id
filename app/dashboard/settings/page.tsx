import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getProfileCompletionSnapshotForUser } from "@/lib/auth/profile-completion";
import { getServerSession } from "@/lib/auth/session";
import { dashboardRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "My Settings",
};

export default async function SettingsPage() {
  const { roles, userId } = await requireAccountSettingsAccess();
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
          backHref={dashboardRoutes.home}
          email={session.user.email}
          roles={roles}
          workspaceVariant="player"
          profileCompletion={profileCompletion}
        />
      </Suspense>
    </PageShell>
  );
}
