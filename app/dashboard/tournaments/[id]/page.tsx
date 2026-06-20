import { PageShell } from "@/components/layout/page-shell";
import { PlayerTournamentWorkspace } from "@/components/dashboard/player/player-tournament-workspace";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Reclub session`,
    description: "Manage your reclub session on TandingBase.",
  };
}

export default async function PlayerTournamentWorkspacePage({ params }: PageProps) {
  await requireRoleGuardContext();
  const { id } = await params;
  const tournamentId = parseEntityIdParam(id, "tournament id");

  return (
    <PageShell showGridBackground={false}>
      <PlayerTournamentWorkspace tournamentId={tournamentId} />
    </PageShell>
  );
}
