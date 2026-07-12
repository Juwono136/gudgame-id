import {
  isBracketMatchLockedForCourt,
} from "@/lib/tournaments/brackets/active-court-lock";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import {
  buildGroupCourtLockState,
  isGroupMatchLockedForCourt,
} from "@/lib/tournaments/double-stage/group-court-lock";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import {
  getBusyTeamIds,
  planIdleCourtReshuffle,
} from "@/lib/tournaments/fun-match/reshuffle-idle-courts";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

export type CourtRef = { id: string; name: string };

export type ParallelCapacityMode = "squads" | "americano" | "bracket" | "groups";

export type ParallelCourtAssignment = {
  courtId: string;
  courtName: string;
  teamAId?: string;
  teamBId?: string;
  bracketMatchId?: string;
  groupMatchId?: string;
};

export type ParallelCapacityInput = {
  courts: CourtRef[];
  mode: ParallelCapacityMode;
  activeReclub: Pick<ReclubMatchView, "teamAId" | "teamBId" | "courtId">[];
  activeBracket: BracketMatchView[];
  activeGroup: GroupMatchView[];
  squads: LobbyTeamView[];
  startableBracket?: BracketMatchView[];
  startableGroup?: GroupMatchView[];
  roundNumber?: number;
  seed?: number;
};

export type ParallelCapacityResult = {
  totalCourts: number;
  liveCourtCount: number;
  idleCourtCount: number;
  assignableSlots: number;
  assignments: ParallelCourtAssignment[];
  restingTeamNames: string[];
  restingPlayerNames: string[];
  blockReason: string | null;
  bannerText: string;
};

function occupiedCourtIds(input: ParallelCapacityInput): Set<string> {
  const ids = new Set<string>();
  for (const m of input.activeReclub) {
    if (m.courtId) ids.add(m.courtId);
  }
  for (const m of input.activeBracket) {
    if (m.status === "in_progress" && m.courtId) ids.add(m.courtId);
  }
  for (const m of input.activeGroup) {
    if (m.status === "in_progress" && m.courtId) ids.add(m.courtId);
  }
  return ids;
}

function assignGroupFixtures(input: ParallelCapacityInput, idleCourts: CourtRef[]) {
  const lock = buildGroupCourtLockState(input.activeGroup);
  const pending = (input.startableGroup ?? []).filter(
    (m) => m.status === "pending" && m.teamAId && m.teamBId,
  );
  const assignments: ParallelCourtAssignment[] = [];
  const usedMatchIds = new Set<string>();

  for (const court of idleCourts) {
    const match = pending.find(
      (m) => !usedMatchIds.has(m.id) && !isGroupMatchLockedForCourt(m, lock),
    );
    if (!match) break;
    usedMatchIds.add(match.id);
    if (match.teamAId) lock.busyTeamIds.add(match.teamAId);
    if (match.teamBId) lock.busyTeamIds.add(match.teamBId);
    assignments.push({
      courtId: court.id,
      courtName: court.name,
      groupMatchId: match.id,
    });
  }

  const busyTeamIds = getBusyTeamIds(input.activeReclub, input.activeBracket);
  for (const m of input.activeGroup) {
    if (m.status === "in_progress") {
      if (m.teamAId) busyTeamIds.add(m.teamAId);
      if (m.teamBId) busyTeamIds.add(m.teamBId);
    }
  }

  const assignedTeamIds = new Set<string>();
  for (const a of assignments) {
    const match = pending.find((m) => m.id === a.groupMatchId);
    if (match?.teamAId) assignedTeamIds.add(match.teamAId);
    if (match?.teamBId) assignedTeamIds.add(match.teamBId);
  }

  const restingTeamNames = input.squads
    .filter(
      (s) =>
        s.memberCount > 0 &&
        !busyTeamIds.has(s.id) &&
        !assignedTeamIds.has(s.id),
    )
    .map((s) => s.name);

  return { assignments, restingTeamNames, restingPlayerNames: [] as string[] };
}

function assignViaReshuffle(input: ParallelCapacityInput, idleCourts: CourtRef[]) {
  const idleCourtIds = idleCourts.map((c) => c.id);
  const busyTeamIds = getBusyTeamIds(input.activeReclub, input.activeBracket);
  for (const m of input.activeGroup) {
    if (m.status === "in_progress") {
      if (m.teamAId) busyTeamIds.add(m.teamAId);
      if (m.teamBId) busyTeamIds.add(m.teamBId);
    }
  }

  const result = planIdleCourtReshuffle({
    mode: input.mode === "groups" ? "squads" : input.mode,
    idleCourtIds,
    squads: input.squads,
    busyTeamIds,
    startableMatches: input.startableBracket,
    activeReclub: input.activeReclub,
    activeBracket: input.activeBracket,
    roundNumber: input.roundNumber ?? 1,
    seed: input.seed ?? 1,
  });

  const courtNameById = new Map(input.courts.map((c) => [c.id, c.name]));

  if (result.kind === "bracket") {
    return {
      assignments: result.assignments.map((a) => ({
        courtId: a.courtId,
        courtName: courtNameById.get(a.courtId) ?? "Court",
        bracketMatchId: a.bracketMatchId,
      })),
      restingTeamNames: [] as string[],
      restingPlayerNames: [] as string[],
    };
  }

  if (result.kind === "americano") {
    return {
      assignments: result.assignments.map((a) => ({
        courtId: a.courtId,
        courtName: courtNameById.get(a.courtId) ?? "Court",
        teamAId: a.teamAId,
        teamBId: a.teamBId,
      })),
      restingTeamNames: [] as string[],
      restingPlayerNames: result.restingPlayerNames,
    };
  }

  return {
    assignments: result.assignments.map((a) => ({
      courtId: a.courtId,
      courtName: courtNameById.get(a.courtId) ?? "Court",
      teamAId: a.teamAId,
      teamBId: a.teamBId,
    })),
    restingTeamNames: result.restingSquadNames,
    restingPlayerNames: [] as string[],
  };
}

function buildBlockReason(input: {
  idleCourtCount: number;
  assignableSlots: number;
  mode: ParallelCapacityMode;
  restingTeamNames: string[];
  restingPlayerNames: string[];
  squads: LobbyTeamView[];
}): string | null {
  if (input.idleCourtCount === 0 || input.assignableSlots > 0) return null;

  if (input.mode === "groups" || input.mode === "squads" || input.mode === "bracket") {
    if (input.restingTeamNames.length === 1) {
      return `${input.restingTeamNames[0]} is resting — need another available team to start a parallel match.`;
    }
    if (input.restingTeamNames.length > 1) {
      return "Not enough disjoint teams for another parallel match — some teams are resting or already playing.";
    }
  }

  if (input.mode === "americano" && input.restingPlayerNames.length) {
    return `Need at least four available players — resting: ${input.restingPlayerNames.join(", ")}.`;
  }

  const eligibleSquads = input.squads.filter((s) => s.memberCount > 0);
  if (eligibleSquads.length < 2) {
    return "Need at least two squads with players to start a match.";
  }

  return "Teams or players overlap with live courts — finish a match to unlock another slot.";
}

function buildBannerText(input: {
  liveCourtCount: number;
  totalCourts: number;
  assignableSlots: number;
  restingTeamNames: string[];
  restingPlayerNames: string[];
}): string {
  const parts: string[] = [];
  parts.push(
    `${input.liveCourtCount} of ${input.totalCourts} court${input.totalCourts === 1 ? "" : "s"} live`,
  );
  if (input.assignableSlots > 0) {
    parts.push(
      `${input.assignableSlots} fixture${input.assignableSlots === 1 ? "" : "s"} ready on idle courts`,
    );
  }
  if (input.restingTeamNames.length === 1) {
    parts.push(`1 team resting (${input.restingTeamNames[0]})`);
  } else if (input.restingTeamNames.length > 1) {
    parts.push(`${input.restingTeamNames.length} teams resting`);
  }
  if (input.restingPlayerNames.length) {
    parts.push(`Resting: ${input.restingPlayerNames.join(", ")}`);
  }
  return parts.join(" · ");
}

/** Max independent fixtures that can start on idle courts without team/player overlap. */
export function computeParallelCapacity(
  input: ParallelCapacityInput,
): ParallelCapacityResult {
  const occupied = occupiedCourtIds(input);
  const idleCourts = input.courts.filter((c) => !occupied.has(c.id));
  const liveCourtCount = input.courts.length - idleCourts.length;

  let assignments: ParallelCourtAssignment[] = [];
  let restingTeamNames: string[] = [];
  let restingPlayerNames: string[] = [];

  if (input.mode === "groups") {
    const groupResult = assignGroupFixtures(input, idleCourts);
    assignments = groupResult.assignments;
    restingTeamNames = groupResult.restingTeamNames;
    restingPlayerNames = groupResult.restingPlayerNames;
  } else {
    const reshuffleResult = assignViaReshuffle(input, idleCourts);
    assignments = reshuffleResult.assignments;
    restingTeamNames = reshuffleResult.restingTeamNames;
    restingPlayerNames = reshuffleResult.restingPlayerNames;
  }

  const assignableSlots = assignments.length;
  const blockReason = buildBlockReason({
    idleCourtCount: idleCourts.length,
    assignableSlots,
    mode: input.mode,
    restingTeamNames,
    restingPlayerNames,
    squads: input.squads,
  });

  return {
    totalCourts: input.courts.length,
    liveCourtCount,
    idleCourtCount: idleCourts.length,
    assignableSlots,
    assignments,
    restingTeamNames,
    restingPlayerNames,
    blockReason,
    bannerText: buildBannerText({
      liveCourtCount,
      totalCourts: input.courts.length,
      assignableSlots,
      restingTeamNames,
      restingPlayerNames,
    }),
  };
}
