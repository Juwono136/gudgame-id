export type ReclubScoreEvent = {
  at: string;
  userId: string;
  userName?: string;
  scoreA: number;
  scoreB: number;
  action: "set" | "increment" | "decrement";
  side?: "a" | "b";
};

export type ReclubMatchMetadata = {
  scoreEvents?: ReclubScoreEvent[];
  teamAPlayers?: string[];
  teamBPlayers?: string[];
};

export function parseReclubMatchMetadata(raw: unknown): ReclubMatchMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const scoreEvents = Array.isArray(obj.scoreEvents)
    ? (obj.scoreEvents as ReclubScoreEvent[])
    : undefined;
  return {
    scoreEvents,
    teamAPlayers: Array.isArray(obj.teamAPlayers)
      ? (obj.teamAPlayers as string[])
      : undefined,
    teamBPlayers: Array.isArray(obj.teamBPlayers)
      ? (obj.teamBPlayers as string[])
      : undefined,
  };
}

export function appendScoreEvent(
  existing: ReclubMatchMetadata,
  event: ReclubScoreEvent,
): ReclubMatchMetadata {
  const prev = existing.scoreEvents ?? [];
  return {
    ...existing,
    scoreEvents: [...prev, event].slice(-200),
  };
}
