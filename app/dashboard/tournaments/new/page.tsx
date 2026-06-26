import { PageShell } from "@/components/layout/page-shell";
import { PlayerCreateReclubWizard } from "@/components/dashboard/player/player-create-reclub-wizard";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { resolveReclubCreateWorkspace } from "@/lib/tournaments/edit-routes";
import { listPublicSports } from "@/lib/sports/service";

export const metadata = {
  title: "Create Reclub Session",
  description: "Start a free community Fun Match on TandingBase.",
};

export default async function PlayerCreateReclubPage() {
  const { roles } = await requireRoleGuardContext();
  const sports = await listPublicSports();
  const workspace = resolveReclubCreateWorkspace(roles);

  return (
    <PageShell showGridBackground={false}>
      <PlayerCreateReclubWizard
        sports={sports.map((s) => ({ slug: s.slug, name: s.name }))}
        defaultSportSlug={sports[0]?.slug ?? "padel"}
        workspace={workspace}
      />
    </PageShell>
  );
}
