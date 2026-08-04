import { notFound, redirect } from "next/navigation";
import { TournamentManageAccessDenied } from "@/components/tournaments/manage/tournament-manage-access-denied";
import { TournamentManageShell } from "@/components/tournaments/manage/tournament-manage-shell";
import { getServerSession } from "@/lib/auth/session";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import { toPartnerFunMatchTournament } from "@/lib/partners/tournament-surface";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";
import { buildTournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { resolveTournamentManageAccess } from "@/lib/tournaments/manage-access";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { partnerPublicRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerTournamentManagePage({ params }: PageProps) {
  const { partnerSlug, slug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const rawTournament = await getPartnerTournamentDetailBySlug(partner.id, slug);
  if (!rawTournament || rawTournament.status === "draft") notFound();
  const tournament = toPartnerFunMatchTournament(rawTournament);

  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        partnerPublicRoutes.tournamentManage(partnerSlug, slug),
      )}`,
    );
  }

  const userId = session.user.id;
  const roles = await getUserRoleAssignments(userId);
  const access = await resolveTournamentManageAccess(tournament, userId, roles);

  if (!access.canAccessManagePage) {
    return (
      <TournamentManageAccessDenied
        sportSlug={tournament.sportSlug}
        slug={slug}
        tournamentName={tournament.name}
        reason="forbidden"
        partnerId={partner.id}
        partnerSlug={partner.slug}
      />
    );
  }

  const [summary, userTeamId] = await Promise.all([
    getRegistrationSummary(
      tournament.id,
      tournament.maxTeams,
      tournament.registrationClosesAt ? new Date(tournament.registrationClosesAt) : null,
      tournament.registrationOpensAt ? new Date(tournament.registrationOpensAt) : null,
      tournament.startsAt ? new Date(tournament.startsAt) : null,
      "fun_match",
      null,
    ),
    getUserTeamInTournament(tournament.id, userId),
  ]);

  const participant = buildTournamentParticipantContext({
    userId,
    userTeamId,
    roles,
    tournamentCreatedBy: tournament.createdBy,
    grantRole: access.grantRole,
    isPartnerMember: access.isPartnerMember,
  });

  const canEdit =
    canManageTournament(roles, tournament.createdBy, userId) || access.isPartnerMember;

  return (
    <TournamentManageShell
      tournament={tournament}
      summary={summary}
      access={access}
      participant={participant}
      canEdit={canEdit}
      partnerSlug={partner.slug}
      partnerDisplayName={partner.displayName}
    />
  );
}
