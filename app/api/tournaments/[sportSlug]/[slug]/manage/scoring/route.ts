import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { listBracketEligibleTeamIds } from "@/lib/tournaments/brackets/eligible-teams";
import { listBracketMatches } from "@/lib/tournaments/brackets/service";
import { getTeamsInActiveBracketMatches } from "@/lib/tournaments/brackets/active-teams";
import { provisionTournamentCourts } from "@/lib/tournaments/courts/service";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";
import { getActiveReclubMatches, listReclubMatches } from "@/lib/tournaments/reclub/matches";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { isFunMatchType, normalizeTournamentType } from "@/lib/tournaments/core/types";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { AppError } from "@/lib/errors";
import {
  getActiveGroupMatches,
  buildDoubleStageOverview,
  initializeDoubleStageGroups,
  listGroupMatches,
  reconcileDoubleStageGroups,
} from "@/lib/tournaments/double-stage/service";
import { getFormatCapabilities } from "@/lib/tournaments/format-capabilities";
import { computeManageWorkspaceStats } from "@/lib/tournaments/stats/from-manage-workspace";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";
import {
  isMatchLiveForTournament,
  normalizeBracketMatchesForDisplay,
  normalizeReclubMatchesForDisplay,
} from "@/lib/tournaments/match-display-status";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    await assertTournamentManagePageAccess(tournament, userId, roles);

    if (tournament.format === "double_stage" && tournament.status === "live") {
      await initializeDoubleStageGroups(tournament);
      await reconcileDoubleStageGroups(tournament);
    }

    const courts = await provisionTournamentCourts(tournament);

    const caps = getFormatCapabilities(tournament);
    const isFunMatch = isFunMatchType(tournament.tournamentType);
    const inGroupPhase = caps.hasGroupStage;
    const showBracket = caps.hasBracket;

    const [teams, reclubMatchesRaw, activeReclubMatchesRaw, bracketMatchesRaw, groupMatchesRaw, activeGroupMatchesRaw, doubleStageOverview, summary, teamsInActiveBracket, bracketEligibleTeamIds] =
      await Promise.all([
        listLobbyTeamsDetailed(tournament.id),
        !caps.hasLobbyRounds ? Promise.resolve([]) : listReclubMatches(tournament.id),
        !caps.hasLobbyRounds ? Promise.resolve([]) : getActiveReclubMatches(tournament.id),
        showBracket ? listBracketMatches(tournament.id) : Promise.resolve([]),
        inGroupPhase || caps.isDoubleStage ? listGroupMatches(tournament.id) : Promise.resolve([]),
        inGroupPhase ? getActiveGroupMatches(tournament.id) : Promise.resolve([]),
        caps.isDoubleStage ? buildDoubleStageOverview(tournament) : Promise.resolve(null),
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
        showBracket ? getTeamsInActiveBracketMatches(tournament.id) : Promise.resolve([]),
        showBracket || caps.isDoubleStage
          ? listBracketEligibleTeamIds(tournament).then((ids) => [...ids])
          : Promise.resolve([] as string[]),
      ]);

    const reclubMatches = normalizeReclubMatchesForDisplay(
      reclubMatchesRaw,
      tournament.status,
    );
    const bracketMatches = normalizeBracketMatchesForDisplay(
      bracketMatchesRaw,
      tournament.status,
    );
    const activeReclubMatches = activeReclubMatchesRaw.filter((m) =>
      isMatchLiveForTournament(m.status, tournament.status),
    );

    const activeBracketMatches = bracketMatches.filter((m) =>
      isMatchLiveForTournament(m.status, tournament.status),
    );

    const sessionStats: TournamentSessionStats = computeManageWorkspaceStats({
      tournament,
      teams,
      reclubMatches,
      bracketMatches,
      groupMatches: groupMatchesRaw,
      summary,
    });

    return jsonSuccess({
      mode: caps.manageScoringMode,
      courts,
      teams,
      reclubMatches,
      activeReclubMatches,
      bracketMatches,
      activeBracketMatches,
      groupMatches: groupMatchesRaw,
      activeGroupMatches: activeGroupMatchesRaw,
      doubleStage: doubleStageOverview,
      summary,
      teamsInActiveBracket,
      bracketEligibleTeamIds,
      sessionStats,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        tournamentType: tournament.tournamentType,
        playersPerTeam: tournament.playersPerTeam,
        maxTeams: tournament.maxTeams,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
