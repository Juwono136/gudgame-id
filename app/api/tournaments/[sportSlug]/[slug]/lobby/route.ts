import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getServerSession } from "@/lib/auth/session";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { getRegistrationSummary, listOfficialPublicRoster } from "@/lib/tournaments/registration/service";
import { getTeamsInActiveBracketMatches } from "@/lib/tournaments/brackets/active-teams";
import { provisionTournamentCourts } from "@/lib/tournaments/courts/service";
import { buildTournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { getActiveReclubMatches, listReclubMatches } from "@/lib/tournaments/reclub/matches";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { AppError } from "@/lib/errors";
import { canManageLiveScoring } from "@/lib/tournaments/permissions";
import { isOfficialType, normalizeTournamentType, supportsRoundBasedPlay } from "@/lib/tournaments/core/types";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import { getUserRoleAssignments } from "@/lib/roles/sync";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (!supportsRoundBasedPlay(tournament)) {
      throw new AppError("Round lobby is not available for this tournament", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    const session = await getServerSession();
    const userId = session?.user?.id ?? null;
    const roles = userId ? await getUserRoleAssignments(userId) : [];

    const courts = await provisionTournamentCourts(tournament);

    const [summary, teams, matches, activeMatches, userTeamId, teamsInActiveBracket, grantRole] =
      await Promise.all([
      getRegistrationSummary(
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
      ),
      isOfficialType(tournament.tournamentType)
        ? listOfficialPublicRoster(tournament.id, tournament.officialBilling)
        : listLobbyTeamsDetailed(tournament.id),
      listReclubMatches(tournament.id),
      getActiveReclubMatches(tournament.id),
      userId ? getUserTeamInTournament(tournament.id, userId) : Promise.resolve(null),
      getTeamsInActiveBracketMatches(tournament.id),
      userId ? getActiveAccessGrantRole(tournament.id, userId) : Promise.resolve(null),
    ]);

    const canManage = userId
      ? canManageLiveScoring(roles, tournament, userId, grantRole)
      : false;

    const participant = buildTournamentParticipantContext({
      userId,
      userTeamId,
      roles,
      tournamentCreatedBy: tournament.createdBy,
      grantRole,
    });

    return jsonSuccess({
      userId,
      tournament: {
        id: tournament.id,
        sportSlug: tournament.sportSlug,
        slug: tournament.slug,
        name: tournament.name,
        status: tournament.status,
        playersPerTeam: tournament.playersPerTeam,
        maxTeams: tournament.maxTeams,
      },
      summary,
      teams,
      matches,
      activeMatch: activeMatches[0] ?? null,
      activeMatches,
      courts,
      userTeamId,
      canManage,
      participant,
      teamsInActiveBracket,
      isAuthenticated: Boolean(userId),
    });
  } catch (error) {
    return jsonError(error);
  }
}
