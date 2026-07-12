import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentGroupMatches,
  tournamentGroupTeams,
  tournamentGroups,
} from "@/db/schema/tournament-groups";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { listBracketEligibleTeamsForGenerate } from "@/lib/tournaments/brackets/eligible-teams";
import { distributeTeamsToGroups } from "@/lib/tournaments/double-stage/allocate-groups";
import { generateRoundRobinFixtures } from "@/lib/tournaments/double-stage/fixtures";
import {
  buildQualifiedTeamsFromStandings,
  provisionKnockoutBracket,
  seedQualifiedTeams,
} from "@/lib/tournaments/double-stage/knockout-bridge";
import {
  allGroupMatchesCompleted,
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
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import {
  getTournamentDeuceConfig,
  getTournamentPointsPerMatch,
  getTournamentRoundDurationMinutes,
  getTournamentScoringType,
} from "@/lib/tournaments/settings";

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
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  courtId: string | null;
  scoreEvents: MatchScoreEvent[];
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
  rank: number;
  qualificationStatus: string;
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
};

async function patchDoubleStageSettings(
  tournament: TournamentDetail,
  patch: Partial<DoubleStageSettings>,
): Promise<void> {
  const current = parseDoubleStageSettings(
    (tournament.settings as Record<string, unknown>)?.doubleStage,
  );
  const next = { ...current, ...patch };
  const settings = { ...tournament.settings, doubleStage: next };
  await getDb()
    .update(tournaments)
    .set({ settings })
    .where(eq(tournaments.id, tournament.id));
  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
}

function getStandingsConfig(tournament: TournamentDetail) {
  const raw = (tournament.settings as Record<string, unknown>)?.standingsScoring;
  if (!raw) {
    return getDefaultStandingsScoringForSport(tournament.sportSlug);
  }
  return parseStandingsScoring(raw);
}

export async function initializeDoubleStageGroups(
  tournament: TournamentDetail,
  options: { requireTeams?: boolean } = {},
): Promise<{ groupCount: number; matchCount: number }> {
  if (tournament.format !== "double_stage") {
    throw new AppError("Not a double stage tournament", {
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

    const fixtures = generateRoundRobinFixtures(g.teams);
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

  const groupOverviews: GroupOverview[] = groups.map((g) => {
    const gTeamIds = groupTeams.filter((gt) => gt.groupId === g.id).map((gt) => gt.teamId);
    const gTeams = gTeamIds.map((id) => ({
      id,
      name: teamNameMap.get(id) ?? "Team",
    }));
    const gMatches = matches.filter((m) => m.groupId === g.id);
    const completedMatches = gMatches
      .filter((m) => m.teamAId && m.teamBId)
      .map((m) => ({
        teamAId: m.teamAId!,
        teamBId: m.teamBId!,
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
        status: m.status,
      }));
    const standings = computeGroupStandings(
      gTeams,
      completedMatches,
      scoringConfig,
      dsSettings.teamsAdvancePerGroup,
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

  const allDone = allGroupMatchesCompleted(matches);
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

  return {
    phase: dsSettings.phase,
    settings: dsSettings,
    groups: groupOverviews,
    knockoutReady: allDone && dsSettings.phase === "group",
    allGroupMatchesCompleted: allDone,
    qualifiedCount,
  };
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
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
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
  const lock = buildGroupCourtLockState(activeMatches, resolvedCourtId);
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
    scoreAction?: "increment" | "decrement" | "set";
    side?: "a" | "b";
    scorerName?: string;
    scorerUserId?: string;
  },
): Promise<GroupMatchView> {
  assertDoubleStageGroupScoringAllowed(tournament);
  const rules = buildScoringRules(tournament);
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
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (match.status !== "in_progress") {
    throw new AppError("Start the match before updating scores.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  let scoreA = Math.max(0, match.scoreA ?? 0);
  let scoreB = Math.max(0, match.scoreB ?? 0);

  if (input.scoreAction === "increment" && input.side) {
    const next = engineApplyDelta(scoreA, scoreB, input.side, 1, rules);
    if (!next) {
      throw new AppError("Cannot increase score — match may be complete or at cap", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    scoreA = next.scoreA;
    scoreB = next.scoreB;
  } else if (input.scoreAction === "decrement" && input.side) {
    const next = engineApplyDelta(scoreA, scoreB, input.side, -1, rules);
    if (!next) {
      throw new AppError("Score cannot go below zero", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    scoreA = next.scoreA;
    scoreB = next.scoreB;
  } else {
    scoreA = Math.max(0, input.scoreA);
    scoreB = Math.max(0, input.scoreB);
  }

  const prevMeta = parseReclubMatchMetadata(match.metadata);
  const event = buildMatchScoreEvent(userId, userName, scoreA, scoreB, {
    action: input.scoreAction ?? "set",
    side: input.side,
    scorerName: input.scorerName,
    scorerUserId: input.scorerUserId,
  });
  const metadata = appendScoreEvent(prevMeta, event);

  const [updated] = await db
    .update(tournamentGroupMatches)
    .set({
      scoreA,
      scoreB,
      metadata,
      recordedByUserId: userId,
    })
    .where(eq(tournamentGroupMatches.id, matchId))
    .returning();

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  const teamPlayerMap = await loadGroupTeamPlayerMap(tournament.id);
  return mapGroupMatchView(updated!, teamPlayerMap);
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
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
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

  let winnerTeamId: string | null = null;
  if (scores.scoreA > scores.scoreB) winnerTeamId = match.teamAId;
  else if (scores.scoreB > scores.scoreA) winnerTeamId = match.teamBId;

  const prevMeta = parseReclubMatchMetadata(match.metadata);
  const metadata =
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
  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  const teamPlayerMap = await loadGroupTeamPlayerMap(tournament.id);
  return mapGroupMatchView(updated!, teamPlayerMap);
}

function mapGroupMatchView(
  m: typeof tournamentGroupMatches.$inferSelect,
  teamPlayerMap?: Map<string, GroupMatchPlayerView[]>,
): GroupMatchView {
  const meta = parseReclubMatchMetadata(m.metadata);
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
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winnerTeamId: m.winnerTeamId,
    status: m.status,
    scheduledAt: m.scheduledAt?.toISOString() ?? null,
    startedAt: m.startedAt?.toISOString() ?? null,
    completedAt: m.completedAt?.toISOString() ?? null,
    courtId: m.courtId,
    scoreEvents: meta.scoreEvents ?? [],
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
  await assertDoubleStageAdvanceAllowed(tournament);
  const overview = await buildDoubleStageOverview(tournament);
  const dsSettings = overview.settings;

  const qualified = buildQualifiedTeamsFromStandings(overview.groups);
  if (qualified.length < 2) {
    throw new AppError("Need at least 2 qualified teams for knockout.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const seeded = seedQualifiedTeams(qualified);
  for (const s of seeded) {
    await getDb()
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
