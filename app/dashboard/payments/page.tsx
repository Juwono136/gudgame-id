import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PlayerPaymentsPage } from "@/components/dashboard/player/player-payments-page";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Payments & Registrations",
  description: "Your official tournament payment history on Gud Game.",
};

export default async function PlayerPaymentsRoute() {
  const { roles } = await requireRoleGuardContext();

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading payments…" />
          </div>
        }
      >
        <PlayerPaymentsPage roles={roles} />
      </Suspense>
    </PageShell>
  );
}
