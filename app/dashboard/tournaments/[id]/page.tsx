import { redirect, notFound } from "next/navigation";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { publicSportRoutes } from "@/lib/constants/routes";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerTournamentWorkspacePage({ params }: PageProps) {
  const { userId, roles } = await requireRoleGuardContext();
  const tournamentId = parseEntityIdParam((await params).id, "tournament id");
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  const canManage = canManageTournament(roles, tournament.createdBy, userId);
  const url = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
  redirect(
    canManage
      ? publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug)
      : url,
  );
}
