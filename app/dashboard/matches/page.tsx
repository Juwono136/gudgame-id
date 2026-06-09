import { PageShell } from "@/components/layout/page-shell";
import { PlayerMatchesListPage } from "@/components/dashboard/player/competition/player-matches-list-page";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Match History",
  description: "Your complete tournament match history on TandingBase.",
};

export default async function PlayerMatchesPage() {
  await requirePlayerDashboardAccess();

  return (
    <PageShell showGridBackground={false}>
      <PlayerMatchesListPage />
    </PageShell>
  );
}
