export type AmericanoPlayer = {
  id: string;
  name: string;
  /** When set, partners prefer staying with the same squad (fixed pairs of 2). */
  squadId?: string;
};

export type AmericanoCourtPairing = {
  courtIndex: number;
  teamA: [AmericanoPlayer, AmericanoPlayer];
  teamB: [AmericanoPlayer, AmericanoPlayer];
};

export type AmericanoRoundPlan = {
  roundNumber: number;
  pairings: AmericanoCourtPairing[];
  resting: AmericanoPlayer[];
};

function seededShuffle<T extends { id: string }>(items: T[], seed: number, roundNumber: number): T[] {
  return [...items].sort((a, b) => {
    const ha = (a.id.charCodeAt(0) + roundNumber * seed) % 1000;
    const hb = (b.id.charCodeAt(0) + roundNumber * seed) % 1000;
    return ha - hb;
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function orderBySeed<T extends { id: string }>(
  items: T[],
  seed: number | undefined,
  roundNumber: number,
): T[] {
  return seed != null ? seededShuffle(items, seed, roundNumber) : shuffle(items);
}

/**
 * Build doubles pairs, preferring registered squad mates (size-2 squads stay together).
 * Remaining singles rotate partners as classic Americano.
 */
export function buildAmericanoPartnerPairs(
  players: AmericanoPlayer[],
  seed?: number,
  roundNumber = 1,
): { pairs: Array<[AmericanoPlayer, AmericanoPlayer]>; resting: AmericanoPlayer[] } {
  const ordered = orderBySeed(players, seed, roundNumber);
  const bySquad = new Map<string, AmericanoPlayer[]>();
  const noSquad: AmericanoPlayer[] = [];

  for (const player of ordered) {
    if (!player.squadId) {
      noSquad.push(player);
      continue;
    }
    const list = bySquad.get(player.squadId) ?? [];
    list.push(player);
    bySquad.set(player.squadId, list);
  }

  const pairs: Array<[AmericanoPlayer, AmericanoPlayer]> = [];
  const leftover: AmericanoPlayer[] = [...noSquad];

  for (const members of bySquad.values()) {
    const pool = [...members];
    while (pool.length >= 2) {
      const a = pool.shift()!;
      const b = pool.shift()!;
      pairs.push([a, b]);
    }
    if (pool[0]) leftover.push(pool[0]);
  }

  const singles = orderBySeed(leftover, seed != null ? seed + 17 : undefined, roundNumber);
  for (let i = 0; i + 1 < singles.length; i += 2) {
    pairs.push([singles[i]!, singles[i + 1]!]);
  }

  const unpairedSingle = singles.length % 2 === 1 ? singles[singles.length - 1] : null;
  const resting = unpairedSingle ? [unpairedSingle] : [];

  const pairTokens = pairs.map((pair, index) => ({
    id: `${pair[0].id}:${pair[1].id}:${index}`,
    pair,
  }));
  const shuffledPairs = orderBySeed(
    pairTokens,
    seed != null ? seed + 31 : undefined,
    roundNumber,
  ).map((entry) => entry.pair);

  return { pairs: shuffledPairs, resting };
}

/**
 * Americano court planner: fill courts with 2v2 pairings.
 * Same-squad partners stay together when squads register as pairs of 2;
 * leftover singles rotate partners across squads (classic Americano).
 */
export function planAmericanoRound(input: {
  players: AmericanoPlayer[];
  courtCount: number;
  roundNumber: number;
  seed?: number;
}): AmericanoRoundPlan {
  const { players, courtCount, roundNumber } = input;
  const { pairs, resting: unpaired } = buildAmericanoPartnerPairs(
    players,
    input.seed,
    roundNumber,
  );

  const orderedPairs = orderBySeed(
    pairs.map((pair, index) => ({ id: `${pair[0].id}-${pair[1].id}-${index}`, pair })),
    input.seed != null ? input.seed + 53 : undefined,
    roundNumber,
  ).map((entry) => entry.pair);

  const pairings: AmericanoCourtPairing[] = [];
  let idx = 0;

  for (let court = 0; court < courtCount; court++) {
    const sideA = orderedPairs[idx];
    const sideB = orderedPairs[idx + 1];
    if (!sideA || !sideB) break;
    pairings.push({
      courtIndex: court,
      teamA: sideA,
      teamB: sideB,
    });
    idx += 2;
  }

  const usedIds = new Set(
    pairings.flatMap((p) => [p.teamA[0].id, p.teamA[1].id, p.teamB[0].id, p.teamB[1].id]),
  );
  const unusedPairs = orderedPairs.slice(idx).flatMap((pair) => pair);
  const resting = [...unpaired, ...unusedPairs].filter((p) => !usedIds.has(p.id));

  return { roundNumber, pairings, resting };
}
