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
import { normalizeTournamentType } from "@/lib/tournaments/core/types";
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
import { formatHasGroupStage } from "@/lib/tournaments/match-config";
import { buildManageScoringRuntime } from "@/lib/tournaments/manage/scoring-runtime";
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

    if (
      formatHasGroupStage(tournament.format) &&
      tournament.status === "live"
    ) {
      await initializeDoubleStageGroups(tournament);
      await reconcileDoubleStageGroups(tournament);
    }

    const courts = await provisionTournamentCourts(tournament);

    let caps = getFormatCapabilities(tournament);
    const showBracket = caps.hasBracket || caps.isDoubleStage;

    const [teams, reclubMatchesRaw, activeReclubMatchesRaw, bracketMatchesRaw, groupMatchesRaw, activeGroupMatchesRaw, doubleStageOverview, summary, teamsInActiveBracket, bracketEligibleTeamIds] =
      await Promise.all([
        listLobbyTeamsDetailed(tournament.id),
        !caps.hasLobbyRounds ? Promise.resolve([]) : listReclubMatches(tournament.id),
        !caps.hasLobbyRounds ? Promise.resolve([]) : getActiveReclubMatches(tournament.id),
        showBracket || caps.canGenerateKnockout
          ? listBracketMatches(tournament.id)
          : Promise.resolve([]),
        caps.hasGroupStage || caps.isDoubleStage || caps.isGroupOnly
          ? listGroupMatches(tournament.id)
          : Promise.resolve([]),
        caps.hasGroupStage || caps.isDoubleStage || caps.isGroupOnly
          ? getActiveGroupMatches(tournament.id)
          : Promise.resolve([]),
        caps.isDoubleStage || caps.isGroupOnly
          ? buildDoubleStageOverview(tournament)
          : Promise.resolve(null),
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
        showBracket || caps.canGenerateKnockout
          ? getTeamsInActiveBracketMatches(tournament.id)
          : Promise.resolve([]),
        showBracket || caps.isDoubleStage
          ? listBracketEligibleTeamIds(tournament).then((ids) => [...ids])
          : Promise.resolve([] as string[]),
      ]);

    // Orphan-bracket heal may flip phase to knockout — re-resolve scoring mode.
    if (
      doubleStageOverview &&
      tournament.format === "double_stage" &&
      doubleStageOverview.phase === "knockout"
    ) {
      caps = getFormatCapabilities({
        ...tournament,
        settings: {
          ...((tournament.settings as Record<string, unknown> | null) ?? {}),
          doubleStage: doubleStageOverview.settings,
        },
      });
    }

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

    const scoringRuntime = buildManageScoringRuntime(tournament, courts.length, caps);

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
      runtime: scoringRuntime,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        tournamentType: tournament.tournamentType,
        playersPerTeam: tournament.playersPerTeam,
        maxTeams: tournament.maxTeams,
        updatedAt: tournament.updatedAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
