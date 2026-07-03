import {
  isBracketMatchLockedForCourt,
} from "@/lib/tournaments/brackets/active-court-lock";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { planAmericanoRound, type AmericanoPlayer } from "@/lib/tournaments/americano/round-planner";
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

function findSquadForPlayer(
  squads: LobbyTeamView[],
  playerId: string,
): LobbyTeamView | undefined {
  return squads.find((s) => s.members?.some((m) => m.userId === playerId));
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
  players: AmericanoPlayer[];
  squads: LobbyTeamView[];
  roundNumber: number;
  seed: number;
}): { assignments: SquadCourtAssignment[]; restingPlayerNames: string[] } {
  const plan = planAmericanoRound({
    players: input.players,
    courtCount: input.idleCourtIds.length || 1,
    roundNumber: input.roundNumber,
    seed: input.seed,
  });

  const assignments: SquadCourtAssignment[] = [];

  plan.pairings.forEach((pairing, idx) => {
    const courtId = input.idleCourtIds[idx];
    if (!courtId) return;
    const squadA = findSquadForPlayer(input.squads, pairing.teamA[0]?.id ?? "");
    const squadB = findSquadForPlayer(input.squads, pairing.teamB[0]?.id ?? "");
    if (squadA && squadB && squadA.id !== squadB.id) {
      assignments.push({
        courtId,
        teamAId: squadA.id,
        teamBId: squadB.id,
      });
    }
  });

  return {
    assignments,
    restingPlayerNames: plan.resting.map((p) => p.name),
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
  players?: AmericanoPlayer[];
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

  if (input.mode === "americano" && input.players && input.players.length >= 4) {
    const { assignments, restingPlayerNames } = reshuffleAmericanoOnIdleCourts({
      idleCourtIds: input.idleCourtIds,
      players: input.players,
      squads: input.squads,
      roundNumber: input.roundNumber ?? 1,
      seed: input.seed,
    });
    return { kind: "americano", assignments, restingPlayerNames };
  }

  const { assignments, restingSquadNames } = reshuffleSquadsOnIdleCourts({
    idleCourtIds: input.idleCourtIds,
    squads: input.squads,
    busyTeamIds: input.busyTeamIds,
    seed: input.seed,
  });
  return { kind: "squads", assignments, restingSquadNames };
}
