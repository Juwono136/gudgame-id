import { getServerSession } from "@/lib/auth/session";
import { OfficialTournamentPage } from "@/components/tournaments/official-tournament-page";
import { ReclubTournamentPage } from "@/components/tournaments/reclub-tournament-page";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";
import { buildTournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import { isOfficialType, normalizeTournamentType } from "@/lib/tournaments/core/types";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { getGearEntitiesForTournamentRules } from "@/lib/tournaments/gear-for-rules";
import {
  getTournamentRuleSections,
  getVenueMapsUrl,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

type TournamentPageRouterProps = {
  tournament: TournamentDetail;
};

export async function TournamentPageRouter({ tournament }: TournamentPageRouterProps) {
  const session = await getServerSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = Boolean(userId);
  const roles = userId ? await getUserRoleAssignments(userId) : [];

  const summary = await getRegistrationSummary(
    tournament.id,
    tournament.maxTeams,
    tournament.registrationClosesAt
      ? new Date(tournament.registrationClosesAt)
      : null,
    tournament.registrationOpensAt
      ? new Date(tournament.registrationOpensAt)
      : null,
    tournament.startsAt ? new Date(tournament.startsAt) : null,
    normalizeTournamentType(tournament.tournamentType),
    tournament.officialBilling,
  );

  if (isOfficialType(tournament.tournamentType)) {
    const ruleSections = getTournamentRuleSections(tournament);
    const gearItems = await getGearEntitiesForTournamentRules(
      tournament.sportId,
      ruleSections.gearEntityIds,
      tournament.sportSlug,
    );

    const userTeamId =
      userId != null ? await getUserTeamInTournament(tournament.id, userId) : null;
    const grantRole =
      userId != null ? await getActiveAccessGrantRole(tournament.id, userId) : null;
    const participant = buildTournamentParticipantContext({
      userId,
      userTeamId,
      roles,
      tournamentCreatedBy: tournament.createdBy,
      grantRole,
    });

    return (
      <OfficialTournamentPage
        tournament={tournament}
        summary={summary}
        isAuthenticated={isAuthenticated}
        canManage={participant.canAccessManagePage}
        canEdit={participant.isOwner}
        participant={participant}
        venueMapsUrl={getVenueMapsUrl(tournament)}
        ruleSections={ruleSections}
        gearItems={gearItems}
      />
    );
  }

  const userTeamId =
    userId != null ? await getUserTeamInTournament(tournament.id, userId) : null;
  const grantRole =
    userId != null ? await getActiveAccessGrantRole(tournament.id, userId) : null;
  const participant = buildTournamentParticipantContext({
    userId,
    userTeamId,
    roles,
    tournamentCreatedBy: tournament.createdBy,
    grantRole,
  });

  return (
    <ReclubTournamentPage
      tournament={tournament}
      summary={summary}
      isAuthenticated={isAuthenticated}
      initialUserTeamId={userTeamId}
      canManage={participant.canAccessManagePage}
      canEdit={participant.isOwner}
      participant={participant}
    />
  );
}
