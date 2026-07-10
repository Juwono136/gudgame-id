import { PageShell } from "@/components/layout/page-shell";
import { PlayerTournamentCreatePicker } from "@/components/dashboard/player/player-tournament-create-picker";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { resolveReclubCreateWorkspace } from "@/lib/tournaments/edit-routes";

export const metadata = {
  title: "Create Fun Match",
  description: "Start a free community Fun Match on Gud Game.",
};

export default async function PlayerCreateReclubPage() {
  const { roles } = await requireRoleGuardContext();
  const workspace = resolveReclubCreateWorkspace(roles);

  return (
    <PageShell showGridBackground={false}>
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <PlayerTournamentCreatePicker workspace={workspace} />
      </div>
    </PageShell>
  );
}
