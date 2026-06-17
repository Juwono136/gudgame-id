import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { HostPaymentsPage } from "@/components/dashboard/host/host-payments-page";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Host payments",
};

export default async function HostPaymentsRoute() {
  const { roles } = await requireHostDashboardAccess();

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading payments…" />
          </div>
        }
      >
        <HostPaymentsPage roles={roles} />
      </Suspense>
    </PageShell>
  );
}
