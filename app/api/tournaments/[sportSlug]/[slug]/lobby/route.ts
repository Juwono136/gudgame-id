import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getServerSession } from "@/lib/auth/session";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";
import { getTeamsInActiveBracketMatches } from "@/lib/tournaments/brackets/active-teams";
import { buildTournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { getActiveReclubMatch, listReclubMatches } from "@/lib/tournaments/reclub/matches";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { isFunMatchType, normalizeTournamentType } from "@/lib/tournaments/core/types";
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

    if (!isFunMatchType(tournament.tournamentType)) {
      throw new AppError("Lobby is only available for Fun Match tournaments", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    const session = await getServerSession();
    const userId = session?.user?.id ?? null;
    const roles = userId ? await getUserRoleAssignments(userId) : [];

    const [summary, teams, matches, activeMatch, userTeamId, teamsInActiveBracket] =
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
      ),
      listLobbyTeamsDetailed(tournament.id),
      listReclubMatches(tournament.id),
      getActiveReclubMatch(tournament.id),
      userId ? getUserTeamInTournament(tournament.id, userId) : Promise.resolve(null),
      getTeamsInActiveBracketMatches(tournament.id),
    ]);

    const canManage = userId
      ? canManageTournament(roles, tournament.createdBy, userId)
      : false;

    const participant = buildTournamentParticipantContext({
      userId,
      userTeamId,
      roles,
      tournamentCreatedBy: tournament.createdBy,
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
      activeMatch,
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
