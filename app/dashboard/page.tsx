import { PageShell } from "@/components/layout/page-shell";
import { PlayerDashboard } from "@/components/dashboard/player/player-dashboard";
import { getPlayerDashboardData } from "@/lib/account/player-dashboard/get-dashboard";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Player Dashboard",
  description: "Your TandingBase player hub — profile, stats, and settings.",
};

export default async function DashboardPage() {
  const { userId } = await requirePlayerDashboardAccess();
  const data = await getPlayerDashboardData(userId);

  return (
    <PageShell showGridBackground={false}>
      <PlayerDashboard data={data} />
    </PageShell>
  );
}
