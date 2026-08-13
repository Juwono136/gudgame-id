export type TeamRef = { id: string; name: string };

export type GroupFixturePair = {
  teamA: TeamRef;
  teamB: TeamRef;
  /** 1-based round for ITF-style day scheduling. */
  round?: number;
};

/**
 * Round-robin fixtures with ITF/LTA-friendly round ordering.
 *
 * For 4 teams (Lines 1–4), day 1 is L1vL2 and L3vL4 — matching official
 * round-robin draw conventions — then remaining rounds fill the RR.
 * For other sizes, uses circle (Berger) method when even/odd n ≥ 3;
 * falls back to combinatorial order for n < 3.
 */
export type GroupFixturePairWithMeeting = GroupFixturePair & {
  /** 1-based meeting index when the same pair plays multiple independent fixtures. */
  meetingIndex?: number;
};

/**
 * Round-robin fixtures. When `meetingsPerPair` > 1, each unordered pair produces
 * that many independent fixtures (each counts in standings).
 */
export function generateRoundRobinFixtures(
  teams: TeamRef[],
  meetingsPerPair = 1,
): GroupFixturePairWithMeeting[] {
  const base = generateRoundRobinFixturesOnce(teams);
  const meetings = Math.max(1, Math.floor(meetingsPerPair) || 1);
  if (meetings === 1) {
    return base.map((f) => ({ ...f, meetingIndex: 1 }));
  }
  const out: GroupFixturePairWithMeeting[] = [];
  for (let meeting = 1; meeting <= meetings; meeting++) {
    for (const f of base) {
      out.push({
        ...f,
        meetingIndex: meeting,
        // Offset rounds so meeting 2+ don't collide with meeting 1 day labels.
        round: f.round != null ? f.round + (meeting - 1) * 100 : undefined,
      });
    }
  }
  return out;
}

function generateRoundRobinFixturesOnce(teams: TeamRef[]): GroupFixturePair[] {
  if (teams.length < 2) return [];
  if (teams.length === 2) {
    return [{ teamA: teams[0]!, teamB: teams[1]!, round: 1 }];
  }
  if (teams.length === 4) {
    return generateFourTeamItfOrder(teams);
  }
  return generateCircleMethod(teams);
}

function generateFourTeamItfOrder(teams: TeamRef[]): GroupFixturePair[] {
  const [l1, l2, l3, l4] = teams;
  return [
    // Day / Round 1 — Line 1 vs Line 2, Line 3 vs Line 4
    { teamA: l1!, teamB: l2!, round: 1 },
    { teamA: l3!, teamB: l4!, round: 1 },
    // Round 2 — cross (stand-in for winners/losers until results known)
    { teamA: l1!, teamB: l3!, round: 2 },
    { teamA: l2!, teamB: l4!, round: 2 },
    // Round 3 — remaining
    { teamA: l1!, teamB: l4!, round: 3 },
    { teamA: l2!, teamB: l3!, round: 3 },
  ];
}

/** Circle / Berger method — standard RR rounds. */
function generateCircleMethod(teams: TeamRef[]): GroupFixturePair[] {
  const n = teams.length;
  const isOdd = n % 2 === 1;
  const slots: (TeamRef | null)[] = isOdd ? [...teams, null] : [...teams];
  const m = slots.length;
  const rounds = m - 1;
  const half = m / 2;
  const fixtures: GroupFixturePair[] = [];

  const arr = [...slots];
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[m - 1 - i];
      if (a && b) {
        fixtures.push({ teamA: a, teamB: b, round: round + 1 });
      }
    }
    // Rotate all but first
    const fixed = arr[0];
    const rest = arr.slice(1);
    const last = rest.pop()!;
    arr.splice(0, arr.length, fixed!, last, ...rest);
  }
  return fixtures;
}

export function fixtureCountForGroupSize(
  teamCount: number,
  meetingsPerPair = 1,
): number {
  if (teamCount < 2) return 0;
  const meetings = Math.max(1, Math.floor(meetingsPerPair) || 1);
  return ((teamCount * (teamCount - 1)) / 2) * meetings;
}

/**
 * FIP Promises-style pool sizing hints for partner create UI.
 * Max 32 pairs → typically 8 pools of 4.
 */
export function fipPoolGuidance(registeredPairs: number): {
  pools: number;
  perPool: number;
  note: string;
} {
  if (registeredPairs <= 0) {
    return { pools: 8, perPool: 4, note: "FIP standard for ≤32 pairs: 8 pools of 4" };
  }
  if (registeredPairs <= 3) {
    return { pools: 1, perPool: registeredPairs, note: "1 pool of 3 (FIP small field)" };
  }
  if (registeredPairs <= 5) {
    return {
      pools: 1,
      perPool: registeredPairs,
      note: `1 pool of ${registeredPairs} (FIP small field)`,
    };
  }
  if (registeredPairs === 6) {
    return { pools: 2, perPool: 3, note: "2 pools of 3 → SF/F (FIP Promises)" };
  }
  if (registeredPairs <= 32) {
    const perPool = 4;
    const pools = Math.ceil(registeredPairs / perPool);
    return {
      pools,
      perPool,
      note: `FIP-style: ~${pools} pools of ${perPool} (max 32 → 8×4)`,
    };
  }
  return {
    pools: Math.ceil(registeredPairs / 4),
    perPool: 4,
    note: "Scale pools of 4; confirm advance rules for field size",
  };
}
