import { notFound } from "next/navigation";
import { PartnerTournamentPublicPage } from "@/components/partners/partner-tournament-public-page";
import { getServerSession } from "@/lib/auth/session";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { listPartnerTournaments } from "@/lib/partners/tournaments";
import { toPartnerFunMatchTournament } from "@/lib/partners/tournament-surface";
import { resolveTournamentManageAccess } from "@/lib/tournaments/manage-access";
import { buildTournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { getPartnerTournamentBySlug } from "@/lib/tournaments/service";
import { getUserRoleAssignments } from "@/lib/roles/sync";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerTournamentDetailPage({ params }: PageProps) {
  const { partnerSlug, slug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const listed = (await listPartnerTournaments(partner.id)).find((t) => t.slug === slug);
  if (!listed) notFound();

  const rawTournament = await getPartnerTournamentBySlug(
    partner.id,
    listed.sportSlug,
    slug,
  );
  if (!rawTournament || rawTournament.status === "draft") notFound();
  const tournament = toPartnerFunMatchTournament(rawTournament);

  const session = await getServerSession();
  const userId = session?.user?.id ?? null;
  const roles = userId ? await getUserRoleAssignments(userId) : [];

  let canManage = false;
  let grantRole: string | null = null;
  let userTeamId: string | null = null;

  if (userId) {
    const [access, teamId] = await Promise.all([
      resolveTournamentManageAccess(tournament, userId, roles),
      getUserTeamInTournament(tournament.id, userId),
    ]);
    canManage = access.canAccessManagePage;
    grantRole = access.grantRole;
    userTeamId = teamId;
  }

  const participant = buildTournamentParticipantContext({
    userId,
    userTeamId,
    roles,
    tournamentCreatedBy: tournament.createdBy,
    grantRole,
  });

  return (
    <PartnerTournamentPublicPage
      partnerSlug={partner.slug}
      partnerName={partner.displayName}
      tournament={tournament}
      participant={participant}
      canManage={canManage}
    />
  );
}
