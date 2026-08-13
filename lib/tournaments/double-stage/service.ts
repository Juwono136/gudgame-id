import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentGroupMatches,
  tournamentGroupTeams,
  tournamentGroups,
} from "@/db/schema/tournament-groups";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { listBracketEligibleTeamsForGenerate } from "@/lib/tournaments/brackets/eligible-teams";
import {
  distributeTeamsToGroups,
  groupNameForIndex,
  planBalancedGroups,
} from "@/lib/tournaments/double-stage/allocate-groups";
import { generateRoundRobinFixtures } from "@/lib/tournaments/double-stage/fixtures";
import {
  buildQualifiedTeamsFromStandings,
  provisionKnockoutBracket,
  seedQualifiedTeams,
} from "@/lib/tournaments/double-stage/knockout-bridge";
import {
  allGroupMatchesCompleted,
  applyBestRunnerUpQualification,
  computeGroupStandings,
} from "@/lib/tournaments/double-stage/standings";
import { assertCourtAvailable, listTournamentCourts } from "@/lib/tournaments/courts/service";
import {
  buildGroupCourtLockState,
  groupMatchLockReason,
  isGroupMatchLockedForCourt,
} from "@/lib/tournaments/double-stage/group-court-lock";
import {
  applyScoreDelta as engineApplyDelta,
  type ScoringRules,
} from "@/lib/tournaments/scoring/engine";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import { getGroupMeetingsPerPair } from "@/lib/tournaments/format-capabilities";
import { formatHasGroupStage } from "@/lib/tournaments/match-config";
import {
  assertDoubleStageAdvanceAllowed,
  assertDoubleStageGroupScoringAllowed,
} from "@/lib/tournaments/lifecycle-guards";
import {
  getDefaultStandingsScoringForSport,
  parseDoubleStageSettings,
  parseStandingsScoring,
  type DoubleStageSettings,
} from "@/lib/tournaments/scoring/config";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  appendScoreEvent,
  parseReclubMatchMetadata,
} from "@/lib/tournaments/reclub/score-events";
import { buildMatchScoreEvent } from "@/lib/tournaments/scoring/build-score-event";
import { recordMatchScoreRevision } from "@/lib/tournaments/scoring/score-revisions";
import {
  assertTimedScoreAllowed,
  buildSuddenDeathEndsAt,
  hasSuddenDeathExtended,
} from "@/lib/tournaments/scoring/timed-hard-stop";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import {
  applyGamePointDelta,
  applyGamePointSet,
  emptyMatchGameState,
  reconcileMatchGamesScores,
  startNextGameAfterWin,
  withCurrentServer,
  type MatchGameState,
} from "@/lib/tournaments/scoring/game-mode";
import {
  applyClassicSetPointDelta,
  classicStatsFromMatchMeta,
  startNextClassicAfterWin,
  sumClassicGames,
} from "@/lib/tournaments/scoring/classic-sets";
import {
  getTournamentClassicSetRules,
  getTournamentDeuceConfig,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentPointsPerMatch,
  getTournamentRoundDurationMinutes,
  getTournamentScoringType,
  getTournamentSkillTier,
  isClassicSetsFormat,
} from "@/lib/tournaments/settings";
import { matchPointsForTournamentTier } from "@/lib/player/tier";

function buildScoringRules(tournament: TournamentDetail): ScoringRules {
  return {
    pointsPerMatch: getTournamentPointsPerMatch(tournament),
    deuceConfig: getTournamentDeuceConfig(tournament),
    scoringType: getTournamentScoringType(tournament),
  };
}

export type GroupMatchPlayerView = {
  userId: string;
  displayName: string;
  image: string | null;
};

export type GroupMatchView = {
  id: string;
  groupId: string;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers: GroupMatchPlayerView[];
  teamBPlayers: GroupMatchPlayerView[];
  /** Games won (race-to-N mode) or flat points (points mode). */
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  courtId: string | null;
  playOrder: number | null;
  callStatus: string | null;
  scoreEvents: MatchScoreEvent[];
  /** Present when tournament uses matchScoreMode = "games". */
  gameState?: MatchGameState | null;
};

export type GroupStandingView = {
  teamId: string;
  teamName: string;
  players: { userId: string; displayName: string; image: string | null }[];
  played: number;
  wins: number;
  losses: number;
  draws: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  points: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  rank: number;
  qualificationStatus: "pending" | "qualified" | "eliminated";
  needsManualResolution?: boolean;
};

export type GroupOverview = {
  id: string;
  name: string;
  sortOrder: number;
  standings: GroupStandingView[];
  matches: GroupMatchView[];
};

export type DoubleStageOverview = {
  phase: "group" | "knockout";
  settings: DoubleStageSettings;
  groups: GroupOverview[];
  knockoutReady: boolean;
  allGroupMatchesCompleted: boolean;
  qualifiedCount: number;
  eligibleTeamCount: number;
  assignedTeamCount: number;
  unassignedEligibleTeams: {
    id: string;
    name: string;
    memberCount: number;
    players: GroupMatchPlayerView[];
  }[];
  canManageAssignments: boolean;
};

type EligibleGroupTeam = {
  id: string;
  name: string;
  memberCount: number;
  players: GroupMatchPlayerView[];
};

async function patchDoubleStageSettings(
  tournament: TournamentDetail,
  patch: Partial<DoubleStageSettings>,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ settings: tournaments.settings })
    .from(tournaments)
    .where(eq(tournaments.id, tournament.id))
    .limit(1);

  const base = {
    ...((row?.settings as Record<string, unknown> | null) ??
      (tournament.settings as Record<string, unknown>) ??
      {}),
  };
  const current = parseDoubleStageSettings(base.doubleStage);
  const next = { ...current, ...patch };
  const settings = { ...base, doubleStage: next };
  await db
    .update(tournaments)
    .set({ settings, updatedAt: new Date() })
    .where(eq(tournaments.id, tournament.id));
  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
}

function getStandingsConfig(tournament: TournamentDetail) {
  const raw = (tournament.settings as Record<string, unknown>)?.standingsScoring;
  const base = raw
    ? parseStandingsScoring(raw)
    : getDefaultStandingsScoringForSport(tournament.sportSlug);

  // Official skill tier owns PTS-per-win (Gold=5, …) so standings match the
  // published match-point scheme even for tournaments created before this wiring.
  const skillTier = getTournamentSkillTier(tournament);
  if (skillTier) {
    return {
      ...base,
      winPoints: matchPointsForTournamentTier(skillTier),
    };
  }
  return base;
}

export async function initializeDoubleStageGroups(
  tournament: TournamentDetail,
  options: { requireTeams?: boolean } = {},
): Promise<{ groupCount: number; matchCount: number }> {
  if (!formatHasGroupStage(tournament.format)) {
    throw new AppError("Not a group-stage tournament", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  const db = getDb();
  const existing = await db
    .select({ id: tournamentGroups.id })
    .from(tournamentGroups)
    .where(eq(tournamentGroups.tournamentId, tournament.id))
    .limit(1);

  if (existing.length > 0) {
    return { groupCount: 0, matchCount: 0 };
  }

  const dsSettings = parseDoubleStageSettings(
    (tournament.settings as Record<string, unknown>)?.doubleStage,
  );
  const teams = await listBracketEligibleTeamsForGenerate(tournament);

  if (teams.length < 2) {
    if (!options.requireTeams) {
      return { groupCount: 0, matchCount: 0 };
    }
    throw new AppError("Need at least 2 confirmed teams to start group stage.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const groups = distributeTeamsToGroups(teams, dsSettings.maxTeamsPerGroup);
  let matchCount = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    const [createdGroup] = await db
      .insert(tournamentGroups)
      .values({
        tournamentId: tournament.id,
        name: g.name,
        sortOrder: gi,
      })
      .returning();

    if (!createdGroup) continue;

    for (const team of g.teams) {
      await db.insert(tournamentGroupTeams).values({
        groupId: createdGroup.id,
        teamId: team.id,
        qualificationStatus: "pending",
      });
    }

    const meetings = getGroupMeetingsPerPair(tournament);
    const fixtures = generateRoundRobinFixtures(g.teams, meetings);
    for (let mi = 0; mi < fixtures.length; mi++) {
      const f = fixtures[mi]!;
      await db.insert(tournamentGroupMatches).values({
        tournamentId: tournament.id,
        groupId: createdGroup.id,
        matchNumber: mi + 1,
        teamAId: f.teamA.id,
        teamBId: f.teamB.id,
        teamAName: f.teamA.name,
        teamBName: f.teamB.name,
        status: "pending",
        playOrder: f.round != null ? f.round * 100 + (mi % 2) + 1 : mi + 1,
        metadata: {
          meetingIndex: f.meetingIndex ?? 1,
          meetingsPerPair: meetings,
        },
      });
      matchCount++;
    }
  }

  await patchDoubleStageSettings(tournament, {
    phase: "group",
    groupsLockedAt: new Date().toISOString(),
  });

  return { groupCount: groups.length, matchCount };
}

function matchesStartedOrCompleted(
  matches: (typeof tournamentGroupMatches.$inferSelect)[],
): boolean {
  return matches.some((match) => match.status !== "pending");
}

async function loadEligibleGroupTeams(
  tournament: TournamentDetail,
): Promise<EligibleGroupTeam[]> {
  const eligible = await listBracketEligibleTeamsForGenerate(tournament);
  if (eligible.length === 0) return [];

  const lobbyTeams = await import("@/lib/tournaments/reclub/teams").then((mod) =>
    mod.listLobbyTeamsDetailed(tournament.id),
  );
  const lobbyMap = new Map(lobbyTeams.map((team) => [team.id, team]));

  return eligible.map((team) => {
    const detailed = lobbyMap.get(team.id);
    return {
      id: team.id,
      name: team.name,
      memberCount: detailed?.memberCount ?? 0,
      players:
        detailed?.members.map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          image: member.image,
        })) ?? [],
    };
  });
}

async function replaceGroupStructure(
  tournament: TournamentDetail,
  groupsInput: { name: string; teamIds: string[] }[],
): Promise<{ groupCount: number; matchCount: number }> {
  const eligibleTeams = await loadEligibleGroupTeams(tournament);
  const eligibleById = new Map(eligibleTeams.map((team) => [team.id, team]));

  if (eligibleTeams.length < 2) {
    throw new AppError("Need at least 2 eligible teams to build groups.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const seen = new Set<string>();
  for (const group of groupsInput) {
    for (const teamId of group.teamIds) {
      if (seen.has(teamId)) {
        throw new AppError("A team can only be assigned to one group.", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      if (!eligibleById.has(teamId)) {
        throw new AppError("Only eligible teams may be assigned to double-stage groups.", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      seen.add(teamId);
    }
  }

  if (seen.size !== eligibleTeams.length) {
    throw new AppError("Every eligible team must be assigned to a group.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const maxPerGroup = parseDoubleStageSettings(
    (tournament.settings as Record<string, unknown>)?.doubleStage,
  ).maxTeamsPerGroup;
  for (const group of groupsInput) {
    if (group.teamIds.length < 2) {
      throw new AppError("Each group must contain at least 2 teams.", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    if (group.teamIds.length > maxPerGroup) {
      throw new AppError(`Groups may contain at most ${maxPerGroup} teams.`, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
  }

  const db = getDb();
  const current = await loadGroupData(tournament.id);
  if (matchesStartedOrCompleted(current.matches)) {
    throw new AppError(
      "Groups cannot be rebuilt after any group match has started. Finish the current stage as-is.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  return db.transaction(async (tx) => {
    const currentGroupIds = current.groups.map((group) => group.id);
    if (currentGroupIds.length > 0) {
      await tx
        .delete(tournamentGroupMatches)
        .where(eq(tournamentGroupMatches.tournamentId, tournament.id));
      await tx
        .delete(tournamentGroupTeams)
        .where(inArray(tournamentGroupTeams.groupId, currentGroupIds));
      await tx
        .delete(tournamentGroups)
        .where(eq(tournamentGroups.tournamentId, tournament.id));
    }

    let matchCount = 0;
    for (let index = 0; index < groupsInput.length; index++) {
      const group = groupsInput[index]!;
      const [createdGroup] = await tx
        .insert(tournamentGroups)
        .values({
          tournamentId: tournament.id,
          name: group.name,
          sortOrder: index,
        })
        .returning();

      if (!createdGroup) continue;

      const teams = group.teamIds
        .map((teamId) => eligibleById.get(teamId))
        .filter((team): team is EligibleGroupTeam => team != null);

      for (const team of teams) {
        await tx.insert(tournamentGroupTeams).values({
          groupId: createdGroup.id,
          teamId: team.id,
          qualificationStatus: "pending",
        });
      }

      const meetings = getGroupMeetingsPerPair(tournament);
      const fixtures = generateRoundRobinFixtures(teams, meetings);
      for (let matchIndex = 0; matchIndex < fixtures.length; matchIndex++) {
        const fixture = fixtures[matchIndex]!;
        await tx.insert(tournamentGroupMatches).values({
          tournamentId: tournament.id,
          groupId: createdGroup.id,
          matchNumber: matchIndex + 1,
          teamAId: fixture.teamA.id,
          teamBId: fixture.teamB.id,
          teamAName: fixture.teamA.name,
          teamBName: fixture.teamB.name,
          status: "pending",
          playOrder:
            fixture.round != null
              ? fixture.round * 100 + (matchIndex % 2) + 1
              : matchIndex + 1,
          metadata: {
            meetingIndex: fixture.meetingIndex ?? 1,
            meetingsPerPair: meetings,
          },
        });
        matchCount++;
      }
    }

    return { groupCount: groupsInput.length, matchCount };
  }).then(async (result) => {
    await patchDoubleStageSettings(tournament, {
      phase: "group",
      groupsLockedAt: new Date().toISOString(),
      knockoutReadyAt: undefined,
      knockoutGeneratedAt: undefined,
    });
    return result;
  });
}

export async function reconcileDoubleStageGroups(
  tournament: TournamentDetail,
): Promise<{ changed: boolean; groupCount: number; matchCount: number }> {
  if (!formatHasGroupStage(tournament.format)) {
    return { changed: false, groupCount: 0, matchCount: 0 };
  }

  const eligibleTeams = await loadEligibleGroupTeams(tournament);
  if (eligibleTeams.length < 2) {
    return { changed: false, groupCount: 0, matchCount: 0 };
  }

  const current = await loadGroupData(tournament.id);
  if (current.groups.length === 0) {
    const created = await initializeDoubleStageGroups(tournament);
    return { changed: created.groupCount > 0, ...created };
  }

  if (matchesStartedOrCompleted(current.matches)) {
    return { changed: false, groupCount: current.groups.length, matchCount: current.matches.length };
  }

  const assignedIds = new Set(current.groupTeams.map((row) => row.teamId));
  const eligibleIds = new Set(eligibleTeams.map((team) => team.id));
  const missingEligible = eligibleTeams.filter((team) => !assignedIds.has(team.id));
  const staleAssigned = current.groupTeams.filter((row) => !eligibleIds.has(row.teamId));

  if (missingEligible.length === 0 && staleAssigned.length === 0) {
    return { changed: false, groupCount: current.groups.length, matchCount: current.matches.length };
  }

  const orderedEligible = eligibleTeams
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const dsSettings = parseDoubleStageSettings(
    (tournament.settings as Record<string, unknown>)?.doubleStage,
  );
  const plannedGroups = distributeTeamsToGroups(orderedEligible, dsSettings.maxTeamsPerGroup);
  const rebuilt = await replaceGroupStructure(
    tournament,
    plannedGroups.map((group) => ({
      name: group.name,
      teamIds: group.teams.map((team) => team.id),
    })),
  );
  return { changed: true, ...rebuilt };
}

export async function saveManualDoubleStageAssignments(
  tournament: TournamentDetail,
  assignments: { groupName: string; teamIds: string[] }[],
): Promise<{ groupCount: number; matchCount: number }> {
  if (!formatHasGroupStage(tournament.format)) {
    throw new AppError("Not a group-stage tournament", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  if (assignments.length === 0) {
    throw new AppError("At least one group assignment is required.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const normalized = assignments.map((group, index) => ({
    name: group.groupName.trim() || groupNameForIndex(index),
    teamIds: group.teamIds,
  }));
  return replaceGroupStructure(tournament, normalized);
}

async function loadGroupData(tournamentId: string) {
  const db = getDb();
  const groups = await db
    .select()
    .from(tournamentGroups)
    .where(eq(tournamentGroups.tournamentId, tournamentId))
    .orderBy(asc(tournamentGroups.sortOrder));

  if (!groups.length) return { groups: [], groupTeams: [], matches: [] };

  const groupIds = groups.map((g) => g.id);
  const groupTeams = await db
    .select()
    .from(tournamentGroupTeams)
    .where(inArray(tournamentGroupTeams.groupId, groupIds));

  const matches = await db
    .select()
    .from(tournamentGroupMatches)
    .where(eq(tournamentGroupMatches.tournamentId, tournamentId))
    .orderBy(asc(tournamentGroupMatches.matchNumber));

  return { groups, groupTeams, matches };
}

async function loadGroupTeamPlayerMap(
  tournamentId: string,
): Promise<Map<string, GroupMatchPlayerView[]>> {
  const { listLobbyTeamsDetailed } = await import("@/lib/tournaments/reclub/teams");
  const lobbyTeams = await listLobbyTeamsDetailed(tournamentId);
  return new Map(
    lobbyTeams.map((t) => [
      t.id,
      t.members.map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        image: m.image,
      })),
    ]),
  );
}

export async function buildDoubleStageOverview(
  tournament: TournamentDetail,
): Promise<DoubleStageOverview> {
  const dsSettings = parseDoubleStageSettings(
    (tournament.settings as Record<string, unknown>)?.doubleStage,
  );
  const scoringConfig = getStandingsConfig(tournament);
  const { groups, groupTeams, matches } = await loadGroupData(tournament.id);

  const { listLobbyTeamsDetailed } = await import("@/lib/tournaments/reclub/teams");
  const lobbyTeams = await listLobbyTeamsDetailed(tournament.id);
  const teamPlayerMap = new Map(
    lobbyTeams.map((t) => [
      t.id,
      t.members.map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        image: m.image,
      })),
    ]),
  );

  const teamNameMap = new Map(lobbyTeams.map((t) => [t.id, t.name]));

  const allDone = allGroupMatchesCompleted(matches);
  const eligibleTeams = await loadEligibleGroupTeams(tournament);
  const assignedTeamIds = new Set(groupTeams.map((row) => row.teamId));
  const unassignedEligibleTeams = eligibleTeams.filter((team) => !assignedTeamIds.has(team.id));
  const canManageAssignments = !matchesStartedOrCompleted(matches);
  const groupOverviews: GroupOverview[] = groups.map((g) => {
    const gTeamIds = groupTeams.filter((gt) => gt.groupId === g.id).map((gt) => gt.teamId);
    const gTeams = gTeamIds.map((id) => ({
      id,
      name: teamNameMap.get(id) ?? "Team",
    }));
    const gMatches = matches.filter((m) => m.groupId === g.id);
    const completedMatches = gMatches
      .filter((m) => m.teamAId && m.teamBId)
      .map((m) => {
        const rawMeta =
          m.metadata && typeof m.metadata === "object"
            ? (m.metadata as Record<string, unknown>)
            : undefined;
        const classic = isClassicSetsFormat(tournament, "group")
          ? classicStatsFromMatchMeta(rawMeta, m.scoreA ?? 0, m.scoreB ?? 0)
          : null;
        return {
          teamAId: m.teamAId!,
          teamBId: m.teamBId!,
          scoreA: m.scoreA ?? 0,
          scoreB: m.scoreB ?? 0,
          status: m.status,
          ...(classic
            ? {
                setsA: classic.setsA,
                setsB: classic.setsB,
                gamesA: classic.gamesA,
                gamesB: classic.gamesB,
              }
            : {}),
        };
      });
    // Lock Qualified/Eliminated only when EVERY group has finished — not per-group early.
    const standings = computeGroupStandings(
      gTeams,
      completedMatches,
      scoringConfig,
      dsSettings.teamsAdvancePerGroup,
      { lockQualification: allDone },
    );

    return {
      id: g.id,
      name: g.name,
      sortOrder: g.sortOrder,
      standings: standings.map((s) => ({
        ...s,
        players: teamPlayerMap.get(s.teamId) ?? [],
      })),
      matches: gMatches.map((m) => mapGroupMatchView(m, teamPlayerMap)),
    };
  });

  if (allDone && (dsSettings.bestRunnerUpSlots ?? 0) > 0) {
    applyBestRunnerUpQualification(
      groupOverviews,
      dsSettings.teamsAdvancePerGroup,
      dsSettings.bestRunnerUpSlots ?? 0,
      scoringConfig,
    );
  }

  const qualifiedCount = groupOverviews.reduce(
    (sum, g) => sum + g.standings.filter((s) => s.qualificationStatus === "qualified").length,
    0,
  );

  if (allDone && !dsSettings.knockoutReadyAt && dsSettings.phase === "group") {
    await patchDoubleStageSettings(tournament, {
      knockoutReadyAt: new Date().toISOString(),
    });
    dsSettings.knockoutReadyAt = new Date().toISOString();
  }

  // Heal orphan bracket: matches were provisioned (auto-advance race / partial
  // failure) but phase never flipped — otherwise Generate stays stuck on CONFLICT.
  if (tournament.format === "double_stage" && dsSettings.phase === "group") {
    const healed = await healOrphanedDoubleStageKnockoutPhase(tournament);
    if (healed) {
      dsSettings.phase = "knockout";
      dsSettings.knockoutGeneratedAt =
        dsSettings.knockoutGeneratedAt ?? new Date().toISOString();
    }
  }

  return {
    phase: dsSettings.phase,
    settings: dsSettings,
    groups: groupOverviews,
    knockoutReady: allDone && dsSettings.phase === "group",
    allGroupMatchesCompleted: allDone,
    qualifiedCount,
    eligibleTeamCount: eligibleTeams.length,
    assignedTeamCount: assignedTeamIds.size,
    unassignedEligibleTeams,
    canManageAssignments,
  };
}

/**
 * If knockout rows already exist while phase is still `group`, adopt them and
 * flip phase so manage/public scoring can enter bracket mode.
 */
export async function healOrphanedDoubleStageKnockoutPhase(
  tournament: TournamentDetail,
): Promise<boolean> {
  if (tournament.format !== "double_stage") return false;

  const db = getDb();
  const existing = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id))
    .limit(1);

  if (existing.length === 0) return false;

  await patchDoubleStageSettings(tournament, {
    phase: "knockout",
    knockoutGeneratedAt: new Date().toISOString(),
  });
  return true;
}

export async function startGroupStageMatch(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  courtId?: string,
): Promise<GroupMatchView> {
  assertDoubleStageGroupScoringAllowed(tournament);
  const db = getDb();

  const [match] = await db
    .select()
    .from(tournamentGroupMatches)
    .where(
      and(
        eq(tournamentGroupMatches.id, matchId),
        eq(tournamentGroupMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);

  if (!match) {
    throw new AppError("Group match not found for this tournament", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
      context: { matchId, tournamentId: tournament.id },
    });
  }
  if (match.status === "completed") {
    throw new AppError("Match already completed", { code: "VALIDATION_ERROR", statusCode: 422 });
  }
  if (match.status === "in_progress" && match.courtId) {
    return mapGroupMatchView(match);
  }
  if (!match.teamAId || !match.teamBId) {
    throw new AppError("Both teams must be set before starting", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  let resolvedCourtId = courtId ?? match.courtId ?? undefined;
  if (!resolvedCourtId) {
    const courts = await listTournamentCourts(tournament.id);
    const available = courts.find((c) => !c.activeMatchId);
    if (!available) {
      throw new AppError("All courts are busy — wait for a match to finish or add more courts", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    resolvedCourtId = available.id;
  }

  await assertCourtAvailable(tournament.id, resolvedCourtId);

  const activeMatches = await getActiveGroupMatches(tournament.id);
  const lock = buildGroupCourtLockState(activeMatches, {
    excludeCourtId: resolvedCourtId,
  });
  const candidate = mapGroupMatchView(match);
  if (isGroupMatchLockedForCourt(candidate, lock)) {
    throw new AppError(
      groupMatchLockReason(candidate, lock) ?? "One of these teams is already playing",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  const scoringType = getTournamentScoringType(tournament);
  const roundMinutes = getTournamentRoundDurationMinutes(tournament);
  const timerEndsAt =
    scoringType === "timed" && roundMinutes
      ? new Date(Date.now() + roundMinutes * 60 * 1000)
      : null;

  const [updated] = await db
    .update(tournamentGroupMatches)
    .set({
      status: "in_progress",
      startedAt: match.startedAt ?? new Date(),
      courtId: resolvedCourtId,
      scoreA: match.scoreA ?? 0,
      scoreB: match.scoreB ?? 0,
      timerEndsAt: timerEndsAt ?? match.timerEndsAt,
      recordedByUserId: userId,
    })
    .where(eq(tournamentGroupMatches.id, matchId))
    .returning();

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  return mapGroupMatchView(updated!);
}

export async function updateGroupStageLiveScore(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  userName: string | null,
  input: {
    scoreA: number;
    scoreB: number;
    scoreAction?: "increment" | "decrement" | "set" | "set_points" | "next_game";
    side?: "a" | "b";
    scorerName?: string;
    scorerUserId?: string;
    servingSide?: "a" | "b";
    serverName?: string;
    serverUserId?: string;
    /** Absolute intra-game points target when scoreAction is set_points. */
    targetPoints?: number;
  },
): Promise<GroupMatchView> {
  assertDoubleStageGroupScoringAllowed(tournament);
  const rules = buildScoringRules(tournament);
  const useGamesMode = getTournamentMatchScoreMode(tournament, "group") === "games";
  const db = getDb();

  const updated = await db.transaction(async (tx) => {
    const [match] = await tx
      .select()
      .from(tournamentGroupMatches)
      .where(
        and(
          eq(tournamentGroupMatches.id, matchId),
          eq(tournamentGroupMatches.tournamentId, tournament.id),
        ),
      )
      .limit(1)
      .for("update");

    if (!match) {
      throw new AppError("Group match not found for this tournament", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { matchId, tournamentId: tournament.id },
      });
    }
    if (match.status !== "in_progress") {
      throw new AppError("Start the match before updating scores.", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const prevMeta = parseReclubMatchMetadata(match.metadata);
    const scoreABefore = Math.max(0, match.scoreA ?? 0);
    const scoreBBefore = Math.max(0, match.scoreB ?? 0);
    let nextTimerEndsAt = match.timerEndsAt ?? null;
    let metaExtra: Record<string, unknown> = {};

    const timedGate = assertTimedScoreAllowed(tournament, {
      timerEndsAt: match.timerEndsAt,
      scoreA: scoreABefore,
      scoreB: scoreBBefore,
      action: input.scoreAction,
      suddenDeathExtended: hasSuddenDeathExtended(match.metadata),
    });
    if (timedGate.blocked && timedGate.reason === "expired_tied_extend") {
      nextTimerEndsAt = buildSuddenDeathEndsAt(tournament);
      metaExtra = { suddenDeathExtended: true };
    }

    let nextGameState = prevMeta.gameState ?? emptyMatchGameState();
    const serverName = input.serverName ?? input.scorerName;
    const serverUserId = input.serverUserId ?? input.scorerUserId;
    // Do not stamp serve on next_game — startNextGameAfterWin flips the side.
    if (input.scoreAction !== "next_game" && (input.servingSide || serverName)) {
      nextGameState = withCurrentServer(nextGameState, {
        servingSide: input.servingSide ?? nextGameState.servingSide ?? "a",
        servingUserId: serverUserId,
        servingName: serverName,
      });
    }
    const reconciled = reconcileMatchGamesScores(match.scoreA, match.scoreB, nextGameState);
    let scoreA = reconciled.scoreA;
    let scoreB = reconciled.scoreB;

    const scoreAction = input.scoreAction;
    const side = input.side;
    /** Point log should show intra-game points in games mode, not games won. */
    let eventScoreA = scoreA;
    let eventScoreB = scoreB;

    if (scoreAction === "next_game") {
      if (!useGamesMode) {
        throw new AppError("next_game is only valid for games scoring", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      if (isClassicSetsFormat(tournament, "group")) {
        const setRules = getTournamentClassicSetRules(tournament, "group");
        const advanced = startNextClassicAfterWin(
          scoreA,
          scoreB,
          nextGameState,
          setRules,
        );
        if (!advanced) {
          throw new AppError("No completed game is waiting to advance", {
            code: "VALIDATION_ERROR",
            statusCode: 422,
          });
        }
        scoreA = advanced.setsA;
        scoreB = advanced.setsB;
        nextGameState = advanced.gameState;
        eventScoreA = 0;
        eventScoreB = 0;
      } else {
        const started = startNextGameAfterWin(nextGameState);
        if (!started) {
          throw new AppError("No completed game is waiting to advance", {
            code: "VALIDATION_ERROR",
            statusCode: 422,
          });
        }
        nextGameState = started;
        eventScoreA = 0;
        eventScoreB = 0;
      }
    } else if (scoreAction === "increment" || scoreAction === "decrement") {
      if (!side) {
        throw new AppError("Missing scoring side for live point update", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      const delta = scoreAction === "decrement" ? (-1 as const) : (1 as const);

      if (useGamesMode && isClassicSetsFormat(tournament, "group")) {
        const gameRules = getTournamentGameRules(tournament, "group");
        const setRules = getTournamentClassicSetRules(tournament, "group");
        const applied = applyClassicSetPointDelta(
          scoreA,
          scoreB,
          nextGameState,
          side,
          delta,
          gameRules,
          setRules,
        );
        if (!applied) {
          throw new AppError(
            delta > 0
              ? nextGameState.pendingGameWinner
                ? "Game finished — tap “Next game” to continue, or undo the last point"
                : "Cannot award point — game, set, or match may already be complete"
              : "Cannot undo — no points available",
            { code: "VALIDATION_ERROR", statusCode: 422 },
          );
        }
        scoreA = applied.setsA;
        scoreB = applied.setsB;
        nextGameState = applied.gameState;
        eventScoreA =
          applied.gameState.phase === "set_tiebreak" ||
          applied.gameState.phase === "super_tiebreak"
            ? (applied.gameState.tbPointsA ?? 0)
            : applied.gameState.currentPointsA;
        eventScoreB =
          applied.gameState.phase === "set_tiebreak" ||
          applied.gameState.phase === "super_tiebreak"
            ? (applied.gameState.tbPointsB ?? 0)
            : applied.gameState.currentPointsB;
      } else if (useGamesMode) {
        const gameRules = getTournamentGameRules(tournament, "group");
        const applied = applyGamePointDelta(
          scoreA,
          scoreB,
          nextGameState,
          side,
          delta,
          gameRules,
        );
        if (!applied) {
          throw new AppError(
            delta > 0
              ? nextGameState.pendingGameWinner
                ? "Game finished — tap “Next game” to continue, or undo the last point"
                : "Cannot award point — game or match may already be complete"
              : "Cannot undo — no points in the current game",
            { code: "VALIDATION_ERROR", statusCode: 422 },
          );
        }
        scoreA = applied.gamesA;
        scoreB = applied.gamesB;
        nextGameState = applied.gameState;
        const synced = reconcileMatchGamesScores(scoreA, scoreB, nextGameState);
        scoreA = synced.scoreA;
        scoreB = synced.scoreB;
        eventScoreA = nextGameState.currentPointsA;
        eventScoreB = nextGameState.currentPointsB;
      } else {
        const next = engineApplyDelta(scoreA, scoreB, side, delta, rules);
        if (!next) {
          throw new AppError(
            delta > 0
              ? "Cannot increase score — match may be complete or at cap"
              : "Score cannot go below zero",
            { code: "VALIDATION_ERROR", statusCode: 422 },
          );
        }
        scoreA = next.scoreA;
        scoreB = next.scoreB;
        eventScoreA = scoreA;
        eventScoreB = scoreB;
      }
    } else if (scoreAction === "set_points") {
      if (!useGamesMode) {
        throw new AppError("set_points is only valid for race-to-N games scoring", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      if (!side) {
        throw new AppError("Missing scoring side for set_points", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      const gameRules = getTournamentGameRules(tournament, "group");
      const target =
        typeof input.targetPoints === "number"
          ? input.targetPoints
          : side === "a"
            ? input.scoreA
            : input.scoreB;
      const applied = applyGamePointSet(
        scoreA,
        scoreB,
        nextGameState,
        side,
        target,
        gameRules,
      );
      if (!applied) {
        throw new AppError(
          nextGameState.pendingGameWinner
            ? "Game finished — tap “Next game” to continue, or undo the last point"
            : "Cannot set points to that target",
          { code: "VALIDATION_ERROR", statusCode: 422 },
        );
      }
      scoreA = applied.gamesA;
      scoreB = applied.gamesB;
      nextGameState = applied.gameState;
      const synced = reconcileMatchGamesScores(scoreA, scoreB, nextGameState);
      scoreA = synced.scoreA;
      scoreB = synced.scoreB;
      eventScoreA = nextGameState.currentPointsA;
      eventScoreB = nextGameState.currentPointsB;
    } else if (scoreAction === "set") {
      scoreA = Math.max(0, input.scoreA);
      scoreB = Math.max(0, input.scoreB);
      if (useGamesMode) {
        nextGameState = {
          currentPointsA: 0,
          currentPointsB: 0,
          completedGames: nextGameState.completedGames,
          pendingGameWinner: null,
        };
      }
      eventScoreA = useGamesMode ? 0 : scoreA;
      eventScoreB = useGamesMode ? 0 : scoreB;
    } else {
      throw new AppError(
        "scoreAction is required (increment, decrement, set, set_points, or next_game)",
        {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        },
      );
    }

    const event = buildMatchScoreEvent(userId, userName, eventScoreA, eventScoreB, {
      action: scoreAction,
      side: scoreAction === "next_game" ? undefined : side,
      scorerName: input.scorerName,
      scorerUserId: input.scorerUserId,
    });
    // Point log is scoring-only — do not persist score reductions in JSONB.
    const withEvent =
      scoreAction === "decrement" ? prevMeta : appendScoreEvent(prevMeta, event);
    const classicExtras = isClassicSetsFormat(tournament, "group")
      ? (() => {
          const totals = sumClassicGames(
            nextGameState.setScores,
            nextGameState.gamesInSetA ?? 0,
            nextGameState.gamesInSetB ?? 0,
          );
          return {
            setsForA: scoreA,
            setsForB: scoreB,
            gamesForA: totals.gamesForA,
            gamesForB: totals.gamesForB,
          };
        })()
      : {};
    const metadata = {
      ...withEvent,
      ...metaExtra,
      ...(useGamesMode ? { gameState: nextGameState } : {}),
      ...classicExtras,
    };

    const [row] = await tx
      .update(tournamentGroupMatches)
      .set({
        scoreA,
        scoreB,
        metadata,
        recordedByUserId: userId,
        ...(nextTimerEndsAt && nextTimerEndsAt !== match.timerEndsAt
          ? { timerEndsAt: nextTimerEndsAt }
          : {}),
      })
      .where(eq(tournamentGroupMatches.id, matchId))
      .returning();

    return {
      row: row!,
      revision: {
        action: scoreAction ?? "set",
        scoreABefore,
        scoreBBefore,
        scoreAAfter: scoreA,
        scoreBAfter: scoreB,
        side,
        gameState: useGamesMode ? nextGameState : undefined,
      } as const,
    };
  });

  await recordMatchScoreRevision({
    tournamentId: tournament.id,
    matchKind: "group",
    matchId,
    action: updated.revision.action,
    scoreABefore: updated.revision.scoreABefore,
    scoreBBefore: updated.revision.scoreBBefore,
    scoreAAfter: updated.revision.scoreAAfter,
    scoreBAfter: updated.revision.scoreBAfter,
    side: updated.revision.side,
    gameState: updated.revision.gameState,
    actorUserId: userId,
    actorName: userName,
  });

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  const teamPlayerMap = await loadGroupTeamPlayerMap(tournament.id);
  return mapGroupMatchView(updated.row, teamPlayerMap);
}

export async function recordGroupStageScore(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  userName: string | null,
  scores: { scoreA: number; scoreB: number; durationSeconds?: number },
): Promise<GroupMatchView> {
  assertDoubleStageGroupScoringAllowed(tournament);
  const scoringConfig = getStandingsConfig(tournament);
  const db = getDb();

  const [match] = await db
    .select()
    .from(tournamentGroupMatches)
    .where(
      and(
        eq(tournamentGroupMatches.id, matchId),
        eq(tournamentGroupMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);

  if (!match) {
    throw new AppError("Group match not found for this tournament", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
      context: { matchId, tournamentId: tournament.id },
    });
  }
  if (!match.teamAId || !match.teamBId) {
    throw new AppError("Invalid match teams", { code: "VALIDATION_ERROR", statusCode: 422 });
  }
  if (match.status !== "in_progress") {
    throw new AppError("Start the match before recording scores.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (scores.scoreA === scores.scoreB && !scoringConfig.allowDraw) {
    throw new AppError("Draws are not allowed for this tournament.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const { assertOfficialLiveGamesMatchComplete } = await import(
    "@/lib/tournaments/scoring/assert-live-games-complete"
  );
  assertOfficialLiveGamesMatchComplete(tournament, "group", scores);

  let winnerTeamId: string | null = null;
  if (scores.scoreA > scores.scoreB) winnerTeamId = match.teamAId;
  else if (scores.scoreB > scores.scoreA) winnerTeamId = match.teamBId;

  const prevMeta = parseReclubMatchMetadata(match.metadata);
  const baseMeta =
    prevMeta.scoreEvents?.length
      ? prevMeta
      : appendScoreEvent(prevMeta, {
          at: new Date().toISOString(),
          userId,
          userName: userName ?? undefined,
          scoreA: scores.scoreA,
          scoreB: scores.scoreB,
          action: "set",
        });
  const classicFinalize = isClassicSetsFormat(tournament, "group")
    ? (() => {
        const gs = baseMeta.gameState;
        const totals = sumClassicGames(
          gs?.setScores,
          gs?.gamesInSetA ?? 0,
          gs?.gamesInSetB ?? 0,
        );
        return {
          setsForA: scores.scoreA,
          setsForB: scores.scoreB,
          gamesForA: totals.gamesForA,
          gamesForB: totals.gamesForB,
        };
      })()
    : {};
  const metadata = { ...baseMeta, ...classicFinalize };

  const [updated] = await db
    .update(tournamentGroupMatches)
    .set({
      scoreA: scores.scoreA,
      scoreB: scores.scoreB,
      winnerTeamId,
      status: "completed",
      completedAt: new Date(),
      durationSeconds: scores.durationSeconds ?? match.durationSeconds,
      recordedByUserId: userId,
      courtId: null,
      metadata,
    })
    .where(eq(tournamentGroupMatches.id, matchId))
    .returning();

  await syncGroupQualificationStatus(tournament);

  await recordMatchScoreRevision({
    tournamentId: tournament.id,
    matchKind: "group",
    matchId,
    action: "complete",
    scoreABefore: match.scoreA ?? 0,
    scoreBBefore: match.scoreB ?? 0,
    scoreAAfter: scores.scoreA,
    scoreBAfter: scores.scoreB,
    actorUserId: userId,
    actorName: userName,
    reason: "Paper / batch final score",
  });

  // Auto-generate knockout when the last group fixture is finalized (double_stage only).
  if (tournament.format === "double_stage") {
    try {
      const overview = await buildDoubleStageOverview(tournament);
      if (
        overview.allGroupMatchesCompleted &&
        overview.phase === "group" &&
        overview.qualifiedCount >= 2
      ) {
        await advanceDoubleStageToElimination(tournament);
      }
    } catch {
      // Host can still generate manually if auto-advance fails.
    }
  }

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  const teamPlayerMap = await loadGroupTeamPlayerMap(tournament.id);
  const teamAPlayers = teamPlayerMap.get(match.teamAId!) ?? [];
  const teamBPlayers = teamPlayerMap.get(match.teamBId!) ?? [];
  const participantUserIds = [...teamAPlayers, ...teamBPlayers]
    .map((p) => p.userId)
    .filter(Boolean);

  if (participantUserIds.length > 0 || tournament.partnerId) {
    const groupName =
      (await db
        .select({ name: tournamentGroups.name })
        .from(tournamentGroups)
        .where(eq(tournamentGroups.id, match.groupId))
        .limit(1))[0]?.name ?? "Group";
    const meetingRaw =
      match.metadata && typeof match.metadata === "object"
        ? (match.metadata as Record<string, unknown>).meetingIndex
        : undefined;
    const meetingIndex =
      typeof meetingRaw === "number" && meetingRaw > 0 ? Math.floor(meetingRaw) : 1;
    const roundLabel =
      meetingIndex > 1
        ? `Group stage: ${groupName} (meet ${meetingIndex})`
        : `Group stage: ${groupName}`;

    if (participantUserIds.length > 0 && !tournament.partnerId) {
      const { syncOfficialMatchToPlayerHistory } = await import("@/lib/tournaments/stats/sync");
      await syncOfficialMatchToPlayerHistory({
        tournament,
        roundLabel,
        fixtureId: match.id,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        scoreA: scores.scoreA,
        scoreB: scores.scoreB,
        participantUserIds,
      });
    }

    if (tournament.partnerId) {
      const { syncPartnerMatchResult } = await import("@/lib/partners/stats/sync");
      await syncPartnerMatchResult({
        tournament,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        scoreA: scores.scoreA,
        scoreB: scores.scoreB,
        round: roundLabel,
      });
    }
  }

  return mapGroupMatchView(updated!, teamPlayerMap);
}

function mapGroupMatchView(
  m: typeof tournamentGroupMatches.$inferSelect,
  teamPlayerMap?: Map<string, GroupMatchPlayerView[]>,
): GroupMatchView {
  const meta = parseReclubMatchMetadata(m.metadata);
  const gameState = meta.gameState ?? null;
  const reconciled = reconcileMatchGamesScores(m.scoreA, m.scoreB, gameState);
  return {
    id: m.id,
    groupId: m.groupId,
    matchNumber: m.matchNumber,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    teamAPlayers: m.teamAId && teamPlayerMap ? (teamPlayerMap.get(m.teamAId) ?? []) : [],
    teamBPlayers: m.teamBId && teamPlayerMap ? (teamPlayerMap.get(m.teamBId) ?? []) : [],
    scoreA: reconciled.scoreA,
    scoreB: reconciled.scoreB,
    winnerTeamId: m.winnerTeamId,
    status: m.status,
    scheduledAt: m.scheduledAt?.toISOString() ?? null,
    startedAt: m.startedAt?.toISOString() ?? null,
    completedAt: m.completedAt?.toISOString() ?? null,
    courtId: m.courtId,
    playOrder: m.playOrder ?? null,
    callStatus: m.callStatus ?? "queued",
    scoreEvents: meta.scoreEvents ?? [],
    gameState,
  };
}

async function syncGroupQualificationStatus(tournament: TournamentDetail): Promise<void> {
  const overview = await buildDoubleStageOverview(tournament);
  const db = getDb();
  for (const g of overview.groups) {
    for (const row of g.standings) {
      await db
        .update(tournamentGroupTeams)
        .set({
          qualificationStatus: row.qualificationStatus,
          groupRank: row.rank,
        })
        .where(
          and(
            eq(tournamentGroupTeams.groupId, g.id),
            eq(tournamentGroupTeams.teamId, row.teamId),
          ),
        );
    }
  }
}

export async function advanceDoubleStageToElimination(
  tournament: TournamentDetail,
): Promise<{ bracketMatchCount: number; qualifiedCount: number }> {
  if (tournament.format === "group_only") {
    throw new AppError("Group-only tournaments do not have a knockout stage.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  await assertDoubleStageAdvanceAllowed(tournament);
  const overview = await buildDoubleStageOverview(tournament);
  const dsSettings = overview.settings;

  const qualified = buildQualifiedTeamsFromStandings(overview.groups, {
    teamsAdvancePerGroup: dsSettings.teamsAdvancePerGroup,
    bestRunnerUpSlots: dsSettings.bestRunnerUpSlots ?? 0,
    scoringConfig: getStandingsConfig(tournament),
  });
  if (qualified.length < 2) {
    throw new AppError("Need at least 2 qualified teams for knockout.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();
  const existingBracket = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id));

  // Idempotent: bracket already exists (auto-gen race / retry after partial write).
  if (existingBracket.length > 0) {
    if (overview.phase !== "knockout") {
      await patchDoubleStageSettings(tournament, {
        phase: "knockout",
        knockoutGeneratedAt: new Date().toISOString(),
      });
    }
    return {
      bracketMatchCount: existingBracket.length,
      qualifiedCount: qualified.length,
    };
  }

  const seeded = seedQualifiedTeams(qualified);
  for (const s of seeded) {
    await db
      .update(tournamentGroupTeams)
      .set({ globalSeed: s.globalSeed })
      .where(eq(tournamentGroupTeams.teamId, s.teamId));
  }

  const { matchCount } = await provisionKnockoutBracket(tournament, seeded, {
    thirdPlaceEnabled: dsSettings.thirdPlaceEnabled,
  });

  await patchDoubleStageSettings(tournament, {
    phase: "knockout",
    knockoutGeneratedAt: new Date().toISOString(),
  });

  return { bracketMatchCount: matchCount, qualifiedCount: qualified.length };
}

export async function listGroupMatches(tournamentId: string): Promise<GroupMatchView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(tournamentGroupMatches)
    .where(eq(tournamentGroupMatches.tournamentId, tournamentId))
    .orderBy(asc(tournamentGroupMatches.matchNumber));

  const teamPlayerMap = await loadGroupTeamPlayerMap(tournamentId);
  return rows.map((row) => mapGroupMatchView(row, teamPlayerMap));
}

export async function getActiveGroupMatches(tournamentId: string): Promise<GroupMatchView[]> {
  const all = await listGroupMatches(tournamentId);
  return all.filter((m) => m.status === "in_progress");
}
