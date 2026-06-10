import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { HostDashboard } from "@/components/dashboard/host-dashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getServerSession } from "@/lib/auth/session";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Host Dashboard",
};

export default async function HostDashboardPage() {
  const { roles } = await requireHostDashboardAccess();
  const session = await getServerSession();
  const user = session?.user;

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading host dashboard…" />
          </div>
        }
      >
        <HostDashboard
          userName={user?.name ?? "Host"}
          userEmail={user?.email ?? ""}
          roles={roles}
        />
      </Suspense>
    </PageShell>
  );
}
