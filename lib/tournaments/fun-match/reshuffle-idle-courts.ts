import {
  isBracketMatchLockedForCourt,
} from "@/lib/tournaments/brackets/active-court-lock";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import {
  applyAmericanoPlanToIdleCourts,
  assignmentsToCourtState,
  flattenAmericanoPlayers,
  type AmericanoPlayerRef,
} from "@/lib/tournaments/americano/court-assignments";
import { planAmericanoRound } from "@/lib/tournaments/americano/round-planner";
import { buildActiveCourtLockState } from "@/lib/tournaments/reclub/active-court-lock";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";

export type SquadCourtAssignment = {
  courtId: string;
  teamAId: string;
  teamBId: string;
};

export type BracketCourtAssignment = {
  courtId: string;
  bracketMatchId: string;
};

export type ReshuffleIdleCourtsResult =
  | {
      kind: "squads";
      assignments: SquadCourtAssignment[];
      restingSquadNames: string[];
    }
  | {
      kind: "bracket";
      assignments: BracketCourtAssignment[];
    }
  | {
      kind: "americano";
      assignments: SquadCourtAssignment[];
      restingPlayerNames: string[];
    };

function shuffleArray<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed & 0x7fffffff;
  const rand = () => {
    state = (state * 1_103_515_245 + 12_345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function getBusyTeamIds(
  activeReclub: Pick<ReclubMatchView, "teamAId" | "teamBId">[],
  activeBracket: Pick<BracketMatchView, "teamAId" | "teamBId">[],
): Set<string> {
  const ids = new Set<string>();
  for (const match of [...activeReclub, ...activeBracket]) {
    if (match.teamAId) ids.add(match.teamAId);
    if (match.teamBId) ids.add(match.teamBId);
  }
  return ids;
}

export function reshuffleSquadsOnIdleCourts(input: {
  idleCourtIds: string[];
  squads: LobbyTeamView[];
  busyTeamIds: Set<string>;
  seed: number;
}): { assignments: SquadCourtAssignment[]; restingSquadNames: string[] } {
  const available = input.squads.filter(
    (s) => s.memberCount > 0 && !input.busyTeamIds.has(s.id),
  );
  const shuffled = shuffleArray(available, input.seed);
  const assignments: SquadCourtAssignment[] = [];

  for (let i = 0; i + 1 < shuffled.length && assignments.length < input.idleCourtIds.length; i += 2) {
    assignments.push({
      courtId: input.idleCourtIds[assignments.length]!,
      teamAId: shuffled[i]!.id,
      teamBId: shuffled[i + 1]!.id,
    });
  }

  const pairedIds = new Set(
    assignments.flatMap((a) => [a.teamAId, a.teamBId]),
  );
  const restingSquadNames = shuffled
    .filter((s) => !pairedIds.has(s.id))
    .map((s) => s.name);

  return { assignments, restingSquadNames };
}

export function reshuffleBracketOnIdleCourts(input: {
  idleCourtIds: string[];
  startableMatches: BracketMatchView[];
  activeReclub: Pick<ReclubMatchView, "teamAId" | "teamBId" | "courtId">[];
  activeBracket: BracketMatchView[];
  teams: LobbyTeamView[];
  seed: number;
}): BracketCourtAssignment[] {
  const lock = buildActiveCourtLockState(
    [...input.activeReclub, ...input.activeBracket],
    input.teams,
  );

  const eligible = input.startableMatches.filter(
    (m) => m.teamAId && m.teamBId && !isBracketMatchLockedForCourt(m, lock, input.teams),
  );

  const shuffled = shuffleArray(eligible, input.seed);
  const usedMatchIds = new Set<string>();
  const assignments: BracketCourtAssignment[] = [];

  for (const courtId of input.idleCourtIds) {
    const match = shuffled.find((m) => !usedMatchIds.has(m.id));
    if (!match) break;
    usedMatchIds.add(match.id);
    assignments.push({ courtId, bracketMatchId: match.id });
  }

  return assignments;
}

export function reshuffleAmericanoOnIdleCourts(input: {
  idleCourtIds: string[];
  players: AmericanoPlayerRef[];
  squads: LobbyTeamView[];
  roundNumber: number;
  seed: number;
  busyPlayerIds?: Set<string>;
}): { assignments: SquadCourtAssignment[]; restingPlayerNames: string[] } {
  const availablePlayers = input.busyPlayerIds
    ? input.players.filter((p) => !input.busyPlayerIds!.has(p.id))
    : input.players;

  const plan = planAmericanoRound({
    players: availablePlayers.map((p) => ({
      id: p.id,
      name: p.name,
      squadId: p.squadId,
    })),
    courtCount: input.idleCourtIds.length || 1,
    roundNumber: input.roundNumber,
    seed: input.seed,
  });

  const result = applyAmericanoPlanToIdleCourts({
    plan,
    idleCourtIds: input.idleCourtIds,
    teams: input.squads,
    busyPlayerIds: input.busyPlayerIds,
  });

  if (!result.ok) {
    return { assignments: [], restingPlayerNames: plan.resting.map((p) => p.name) };
  }

  const courtState = assignmentsToCourtState(result.assignments);
  const assignments: SquadCourtAssignment[] = result.assignments.map((assignment) => ({
    courtId: assignment.courtId,
    teamAId: courtState.teamAByCourt[assignment.courtId]!,
    teamBId: courtState.teamBByCourt[assignment.courtId]!,
  }));

  return {
    assignments,
    restingPlayerNames: result.restingNames,
  };
}

export function planIdleCourtReshuffle(input: {
  mode: "bracket" | "squads" | "americano";
  idleCourtIds: string[];
  squads: LobbyTeamView[];
  busyTeamIds: Set<string>;
  startableMatches?: BracketMatchView[];
  activeReclub?: Pick<ReclubMatchView, "teamAId" | "teamBId" | "courtId">[];
  activeBracket?: BracketMatchView[];
  roundNumber?: number;
  seed: number;
}): ReshuffleIdleCourtsResult {
  if (input.mode === "bracket") {
    return {
      kind: "bracket",
      assignments: reshuffleBracketOnIdleCourts({
        idleCourtIds: input.idleCourtIds,
        startableMatches: input.startableMatches ?? [],
        activeReclub: input.activeReclub ?? [],
        activeBracket: input.activeBracket ?? [],
        teams: input.squads,
        seed: input.seed,
      }),
    };
  }

  if (input.mode === "americano") {
    const players = flattenAmericanoPlayers(input.squads);
    if (players.length >= 4) {
      const busyPlayerIds = new Set<string>();
      for (const teamId of input.busyTeamIds) {
        const squad = input.squads.find((s) => s.id === teamId);
        for (const member of squad?.members ?? []) {
          busyPlayerIds.add(member.userId);
        }
      }

      const { assignments, restingPlayerNames } = reshuffleAmericanoOnIdleCourts({
        idleCourtIds: input.idleCourtIds,
        players,
        squads: input.squads,
        roundNumber: input.roundNumber ?? 1,
        seed: input.seed,
        busyPlayerIds,
      });
      return { kind: "americano", assignments, restingPlayerNames };
    }
  }

  const { assignments, restingSquadNames } = reshuffleSquadsOnIdleCourts({
    idleCourtIds: input.idleCourtIds,
    squads: input.squads,
    busyTeamIds: input.busyTeamIds,
    seed: input.seed,
  });
  return { kind: "squads", assignments, restingSquadNames };
}
