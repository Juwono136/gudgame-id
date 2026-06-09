import { PageShell } from "@/components/layout/page-shell";
import { PlayerTournamentsListPage } from "@/components/dashboard/player/competition/player-tournaments-list-page";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Tournament History",
  description: "Your complete tournament placement history on TandingBase.",
};

export default async function PlayerTournamentsPage() {
  await requirePlayerDashboardAccess();

  return (
    <PageShell showGridBackground={false}>
      <PlayerTournamentsListPage />
    </PageShell>
  );
}
