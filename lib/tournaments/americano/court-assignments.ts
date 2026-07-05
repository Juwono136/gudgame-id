import type { AmericanoRoundPlan } from "@/lib/tournaments/americano/round-planner";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

export const AMERICANO_PAIR_PREFIX = "americano-pair:";

export type AmericanoPlayerRef = {
  id: string;
  name: string;
  squadId: string;
};

export type AmericanoCourtAssignment = {
  courtId: string;
  sideA: [AmericanoPlayerRef, AmericanoPlayerRef];
  sideB: [AmericanoPlayerRef, AmericanoPlayerRef];
};

export function flattenAmericanoPlayers(teams: LobbyTeamView[]): AmericanoPlayerRef[] {
  const players: AmericanoPlayerRef[] = [];
  for (const squad of teams) {
    for (const member of squad.members ?? []) {
      players.push({
        id: member.userId,
        name: member.displayName ?? "Player",
        squadId: squad.id,
      });
    }
  }
  return players;
}

export function encodeAmericanoPair(playerIds: [string, string]): string {
  return `${AMERICANO_PAIR_PREFIX}${playerIds[0]}:${playerIds[1]}`;
}

export function decodeAmericanoPair(value: string): [string, string] | null {
  if (!value.startsWith(AMERICANO_PAIR_PREFIX)) return null;
  const parts = value.slice(AMERICANO_PAIR_PREFIX.length).split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export function isAmericanoPairKey(value: string | undefined | null): value is string {
  return Boolean(value?.startsWith(AMERICANO_PAIR_PREFIX));
}

export function getBusyPlayerIds(
  activeMatches: Pick<ReclubMatchView, "courtId" | "teamAId" | "teamBId" | "americanoPairing">[],
  teams: LobbyTeamView[],
): Set<string> {
  const busy = new Set<string>();

  for (const match of activeMatches) {
    if (match.americanoPairing) {
      for (const id of [...match.americanoPairing.sideA, ...match.americanoPairing.sideB]) {
        busy.add(id);
      }
      continue;
    }

    for (const teamId of [match.teamAId, match.teamBId]) {
      if (!teamId) continue;
      const squad = teams.find((t) => t.id === teamId);
      for (const member of squad?.members ?? []) {
        busy.add(member.userId);
      }
    }
  }

  return busy;
}

export function buildAmericanoCourtAssignments(input: {
  plan: AmericanoRoundPlan;
  idleCourtIds: string[];
  players: AmericanoPlayerRef[];
}): AmericanoCourtAssignment[] {
  const playerById = new Map(input.players.map((p) => [p.id, p]));
  const assignments: AmericanoCourtAssignment[] = [];

  input.plan.pairings.forEach((pairing, idx) => {
    const courtId = input.idleCourtIds[idx];
    if (!courtId) return;

    const a1 = playerById.get(pairing.teamA[0]?.id ?? "");
    const a2 = playerById.get(pairing.teamA[1]?.id ?? "");
    const b1 = playerById.get(pairing.teamB[0]?.id ?? "");
    const b2 = playerById.get(pairing.teamB[1]?.id ?? "");
    if (!a1 || !a2 || !b1 || !b2) return;

    const sideIds = new Set([a1.id, a2.id, b1.id, b2.id]);
    if (sideIds.size < 4) return;

    assignments.push({
      courtId,
      sideA: [a1, a2],
      sideB: [b1, b2],
    });
  });

  return assignments;
}

export function assignmentsToCourtState(assignments: AmericanoCourtAssignment[]): {
  teamAByCourt: Record<string, string>;
  teamBByCourt: Record<string, string>;
} {
  const teamAByCourt: Record<string, string> = {};
  const teamBByCourt: Record<string, string> = {};

  for (const assignment of assignments) {
    teamAByCourt[assignment.courtId] = encodeAmericanoPair([
      assignment.sideA[0].id,
      assignment.sideA[1].id,
    ]);
    teamBByCourt[assignment.courtId] = encodeAmericanoPair([
      assignment.sideB[0].id,
      assignment.sideB[1].id,
    ]);
  }

  return { teamAByCourt, teamBByCourt };
}

export function decodeCourtAmericanoPairing(
  teamAKey: string,
  teamBKey: string,
): { sideA: [string, string]; sideB: [string, string] } | null {
  const sideA = decodeAmericanoPair(teamAKey);
  const sideB = decodeAmericanoPair(teamBKey);
  if (!sideA || !sideB) return null;
  return { sideA, sideB };
}

export function resolveAmericanoPairLabels(
  teamAKey: string,
  teamBKey: string,
  players: AmericanoPlayerRef[],
): { sideALabel: string; sideBLabel: string; sideAPlayers: string[]; sideBPlayers: string[] } | null {
  const pairing = decodeCourtAmericanoPairing(teamAKey, teamBKey);
  if (!pairing) return null;

  const byId = new Map(players.map((p) => [p.id, p]));
  const sideAPlayers = pairing.sideA.map((id) => byId.get(id)?.name ?? "Player");
  const sideBPlayers = pairing.sideB.map((id) => byId.get(id)?.name ?? "Player");

  return {
    sideALabel: sideAPlayers.join(" / "),
    sideBLabel: sideBPlayers.join(" / "),
    sideAPlayers,
    sideBPlayers,
  };
}

export type ApplyAmericanoPlanResult =
  | {
      ok: true;
      assignments: AmericanoCourtAssignment[];
      restingNames: string[];
    }
  | {
      ok: false;
      reason:
        | "not_enough_players"
        | "no_idle_courts"
        | "no_pairings"
        | "not_enough_available_players"
        | "assignment_failed";
      message: string;
    };

export function applyAmericanoPlanToIdleCourts(input: {
  plan: AmericanoRoundPlan | null;
  idleCourtIds: string[];
  teams: LobbyTeamView[];
  busyPlayerIds?: Set<string>;
}): ApplyAmericanoPlanResult {
  if (!input.idleCourtIds.length) {
    return {
      ok: false,
      reason: "no_idle_courts",
      message: "All courts are busy — finish a match before applying a round plan.",
    };
  }

  const allPlayers = flattenAmericanoPlayers(input.teams);
  if (allPlayers.length < 4) {
    return {
      ok: false,
      reason: "not_enough_players",
      message: "Americano needs at least 4 registered players before courts can be assigned.",
    };
  }

  if (!input.plan?.pairings.length) {
    return {
      ok: false,
      reason: "no_pairings",
      message: "Not enough players to fill even one court (4 players per court).",
    };
  }

  const busy = input.busyPlayerIds ?? new Set<string>();
  const availablePlayers = allPlayers.filter((p) => !busy.has(p.id));
  if (availablePlayers.length < 4) {
    return {
      ok: false,
      reason: "not_enough_available_players",
      message: "Too few idle players — wait for live matches to finish or add more players.",
    };
  }

  const availableIds = new Set(availablePlayers.map((p) => p.id));
  const filteredPlan: AmericanoRoundPlan = {
    ...input.plan,
    pairings: input.plan.pairings.filter((pairing) =>
      [pairing.teamA[0]?.id, pairing.teamA[1]?.id, pairing.teamB[0]?.id, pairing.teamB[1]?.id].every(
        (id) => id && availableIds.has(id),
      ),
    ),
    resting: input.plan.resting.filter((p) => availableIds.has(p.id)),
  };

  if (!filteredPlan.pairings.length) {
    return {
      ok: false,
      reason: "assignment_failed",
      message: "Could not build pairings with the players currently available on idle courts.",
    };
  }

  const assignments = buildAmericanoCourtAssignments({
    plan: filteredPlan,
    idleCourtIds: input.idleCourtIds,
    players: availablePlayers,
  });

  if (!assignments.length) {
    return {
      ok: false,
      reason: "assignment_failed",
      message: "Could not map round pairings to courts — try reshuffling.",
    };
  }

  const assignedIds = new Set(
    assignments.flatMap((a) => [
      a.sideA[0].id,
      a.sideA[1].id,
      a.sideB[0].id,
      a.sideB[1].id,
    ]),
  );
  const restingNames = allPlayers
    .filter((p) => !busy.has(p.id) && !assignedIds.has(p.id))
    .map((p) => p.name);

  return { ok: true, assignments, restingNames };
}
