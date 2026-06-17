import { getServerSession } from "@/lib/auth/session";
import { OfficialTournamentPage } from "@/components/tournaments/official-tournament-page";
import { ReclubTournamentPage } from "@/components/tournaments/reclub-tournament-page";
import { getRegistrationSummary, listOfficialPublicRoster } from "@/lib/tournaments/registration/service";
import { canManageTournament } from "@/lib/tournaments/permissions";
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
  const canManage = userId
    ? canManageTournament(roles, tournament.createdBy, userId)
    : false;

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
  );

  if (tournament.tournamentType === "official") {
    const ruleSections = getTournamentRuleSections(tournament);
    const gearItems = await getGearEntitiesForTournamentRules(
      tournament.sportId,
      ruleSections.gearEntityIds,
    );
    const publicRoster = await listOfficialPublicRoster(tournament.id);

    return (
      <OfficialTournamentPage
        tournament={tournament}
        summary={summary}
        publicRoster={publicRoster}
        isAuthenticated={isAuthenticated}
        canManage={canManage}
        venueMapsUrl={getVenueMapsUrl(tournament)}
        ruleSections={ruleSections}
        gearItems={gearItems}
      />
    );
  }

  const userTeamId =
    userId != null ? await getUserTeamInTournament(tournament.id, userId) : null;

  return (
    <ReclubTournamentPage
      tournament={tournament}
      summary={summary}
      isAuthenticated={isAuthenticated}
      initialUserTeamId={userTeamId}
    />
  );
}
