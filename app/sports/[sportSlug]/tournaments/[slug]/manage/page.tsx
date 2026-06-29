import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentManageShell } from "@/components/tournaments/manage/tournament-manage-shell";
import { getServerSession } from "@/lib/auth/session";
import { getSportBySlug } from "@/lib/wiki/public";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";
import { buildTournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { normalizeTournamentType } from "@/lib/tournaments/core/types";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { tournamentEditUrl } from "@/lib/tournaments/edit-routes";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const tournament = await getTournamentBySlug(sportSlug, slug);
  return { title: tournament ? `Manage · ${tournament.name}` : "Manage tournament" };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TournamentManagePage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament || tournament.status === "draft") notFound();

  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/sports/${sportSlug}/tournaments/${slug}/manage`);
  }

  const userId = session.user.id;
  const roles = await getUserRoleAssignments(userId);
  const access = await assertTournamentManagePageAccess(tournament, userId, roles);

  const [summary, userTeamId] = await Promise.all([
    getRegistrationSummary(
      tournament.id,
      tournament.maxTeams,
      tournament.registrationClosesAt ? new Date(tournament.registrationClosesAt) : null,
      tournament.registrationOpensAt ? new Date(tournament.registrationOpensAt) : null,
      tournament.startsAt ? new Date(tournament.startsAt) : null,
      normalizeTournamentType(tournament.tournamentType),
      tournament.officialBilling,
    ),
    getUserTeamInTournament(tournament.id, userId),
  ]);

  const participant = buildTournamentParticipantContext({
    userId,
    userTeamId,
    roles,
    tournamentCreatedBy: tournament.createdBy,
    grantRole: access.grantRole,
  });

  const canEdit = canManageTournament(roles, tournament.createdBy, userId);

  return (
    <PageShell>
      <TournamentManageShell
        tournament={tournament}
        summary={summary}
        access={access}
        participant={participant}
        canEdit={canEdit}
      />
    </PageShell>
  );
}
