import { PageShell } from "@/components/layout/page-shell";
import { PlayerCreateReclubWizard } from "@/components/dashboard/player/player-create-reclub-wizard";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { listPublicSports } from "@/lib/sports/service";

export const metadata = {
  title: "Create Reclub Session",
  description: "Start a free community reclub session as a host on TandingBase.",
};

export default async function HostCreateReclubPage() {
  await requireHostDashboardAccess();
  const sports = await listPublicSports();

  return (
    <PageShell showGridBackground={false}>
      <PlayerCreateReclubWizard
        sports={sports.map((s) => ({ slug: s.slug, name: s.name }))}
        defaultSportSlug={sports[0]?.slug ?? "padel"}
        workspace="host"
      />
    </PageShell>
  );
}
