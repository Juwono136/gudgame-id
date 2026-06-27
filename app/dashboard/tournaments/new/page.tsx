import { PageShell } from "@/components/layout/page-shell";
import { PlayerTournamentCreatePicker } from "@/components/dashboard/player/player-tournament-create-picker";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { resolveReclubCreateWorkspace } from "@/lib/tournaments/edit-routes";
import { listPublicSports } from "@/lib/sports/service";

export const metadata = {
  title: "Create Fun Match",
  description: "Start a free community Fun Match on TandingBase.",
};

export default async function PlayerCreateReclubPage() {
  const { roles } = await requireRoleGuardContext();
  const sports = await listPublicSports();
  const workspace = resolveReclubCreateWorkspace(roles);

  return (
    <PageShell showGridBackground={false}>
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <PlayerTournamentCreatePicker
          sports={sports.map((s) => ({ slug: s.slug, name: s.name }))}
          defaultSportSlug={sports[0]?.slug ?? "padel"}
          workspace={workspace}
        />
      </div>
    </PageShell>
  );
}
