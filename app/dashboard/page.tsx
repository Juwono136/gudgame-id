import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PlayerDashboard } from "@/components/dashboard/player/player-dashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getPlayerDashboardData } from "@/lib/account/player-dashboard/get-dashboard";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Player Dashboard",
  description: "Your Gud Game player hub — profile, stats, and settings.",
};

export default async function DashboardPage() {
  const { userId } = await requirePlayerDashboardAccess();
  const data = await getPlayerDashboardData(userId);

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading dashboard…" />
          </div>
        }
      >
        <PlayerDashboard data={data} />
      </Suspense>
    </PageShell>
  );
}
