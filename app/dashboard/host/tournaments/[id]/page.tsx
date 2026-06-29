import { redirect, notFound } from "next/navigation";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { publicSportRoutes } from "@/lib/constants/routes";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HostTournamentWorkspacePage({ params }: PageProps) {
  const { userId, roles } = await requireHostDashboardAccess();
  const tournamentId = parseEntityIdParam((await params).id, "tournament id");
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  if (!canManageTournament(roles, tournament.createdBy, userId)) {
    redirect(publicSportRoutes.tournament(tournament.sportSlug, tournament.slug));
  }

  redirect(publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug));
}
