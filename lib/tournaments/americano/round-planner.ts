export type AmericanoPlayer = {
  id: string;
  name: string;
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

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Simple rotation planner: shuffle players each round and fill courts with doubles pairings.
 * Players not assigned to a court rest for the round.
 */
export function planAmericanoRound(input: {
  players: AmericanoPlayer[];
  courtCount: number;
  roundNumber: number;
  seed?: number;
}): AmericanoRoundPlan {
  const { players, courtCount, roundNumber } = input;
  const ordered =
    input.seed != null
      ? [...players].sort((a, b) => {
          const ha = (a.id.charCodeAt(0) + roundNumber * input.seed!) % 1000;
          const hb = (b.id.charCodeAt(0) + roundNumber * input.seed!) % 1000;
          return ha - hb;
        })
      : shuffle(players);

  const pairings: AmericanoCourtPairing[] = [];
  let idx = 0;
  const playersPerCourt = 4;

  for (let court = 0; court < courtCount; court++) {
    const slice = ordered.slice(idx, idx + playersPerCourt);
    if (slice.length < playersPerCourt) break;
    pairings.push({
      courtIndex: court,
      teamA: [slice[0]!, slice[1]!],
      teamB: [slice[2]!, slice[3]!],
    });
    idx += playersPerCourt;
  }

  const resting = ordered.slice(idx);
  return { roundNumber, pairings, resting };
}
