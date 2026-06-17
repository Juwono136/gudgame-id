import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { adminRoutes } from "@/lib/constants/routes";
import { assertTournamentEditable } from "@/lib/tournaments/manage-policy";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditTournamentPage({ params }: PageProps) {
  const ctx = await requireWikiManagementAccess();
  const tournamentId = Number((await params).id);
  if (!Number.isFinite(tournamentId) || tournamentId <= 0) notFound();

  const tournament = await getTournamentById(tournamentId);
  if (!tournament || tournament.sportId !== ctx.sportId) notFound();

  try {
    assertTournamentEditable(tournament);
  } catch {
    redirect(adminRoutes.wikiEntities);
  }

  return (
    <AdminShell
      context={ctx}
      title="Edit tournament"
      breadcrumbs={[
        { label: "Wiki Entities", href: adminRoutes.wikiEntities },
        { label: tournament.name },
      ]}
    >
      <Link
        href={adminRoutes.wikiEntities}
        className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to wiki entities
      </Link>
      <p className="mt-4 text-sm text-cp-muted">{tournament.name}</p>
      <div className="mt-6">
        <TournamentCreateWizard
          sportSlug={ctx.sportSlug}
          initial={tournament}
          tournamentId={tournamentId}
          mode="admin"
        />
      </div>
    </AdminShell>
  );
}
