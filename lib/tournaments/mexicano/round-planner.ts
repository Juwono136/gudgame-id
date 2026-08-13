/**
 * Mexicano round planner — Individual (rotating partners by rank) and Team (fixed pairs by rank).
 * Round 1 is random; later rounds seed from the live leaderboard.
 */

export type MexicanoPlayer = {
  id: string;
  name: string;
  /** Cumulative points for leaderboard seeding. */
  points: number;
  /** Fixed pair id when mode = team. */
  teamId?: string;
};

export type MexicanoCourtPairing = {
  courtIndex: number;
  teamA: [MexicanoPlayer, MexicanoPlayer];
  teamB: [MexicanoPlayer, MexicanoPlayer];
};

export type MexicanoRoundPlan = {
  roundNumber: number;
  mode: "individual" | "team";
  pairings: MexicanoCourtPairing[];
  resting: MexicanoPlayer[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function byPointsDesc(a: MexicanoPlayer, b: MexicanoPlayer): number {
  if (b.points !== a.points) return b.points - a.points;
  return a.name.localeCompare(b.name);
}

/** Classic nearby ranks: 1+4 vs 2+3 within each block of 4. */
function individualBlockPairing(
  ranked: MexicanoPlayer[],
): MexicanoCourtPairing[] {
  const pairings: MexicanoCourtPairing[] = [];
  let court = 0;
  for (let i = 0; i + 3 < ranked.length; i += 4) {
    const p1 = ranked[i]!;
    const p2 = ranked[i + 1]!;
    const p3 = ranked[i + 2]!;
    const p4 = ranked[i + 3]!;
    pairings.push({
      courtIndex: court++,
      teamA: [p1, p4],
      teamB: [p2, p3],
    });
  }
  return pairings;
}

/** Fixed teams ordered by combined points: 1v2, 3v4, … */
function teamBlockPairing(rankedPlayers: MexicanoPlayer[]): {
  pairings: MexicanoCourtPairing[];
  resting: MexicanoPlayer[];
} {
  const byTeam = new Map<string, MexicanoPlayer[]>();
  const singles: MexicanoPlayer[] = [];
  for (const p of rankedPlayers) {
    if (!p.teamId) {
      singles.push(p);
      continue;
    }
    const list = byTeam.get(p.teamId) ?? [];
    list.push(p);
    byTeam.set(p.teamId, list);
  }

  const teams: Array<{ id: string; players: [MexicanoPlayer, MexicanoPlayer]; points: number }> =
    [];
  for (const [id, members] of byTeam) {
    if (members.length < 2) {
      singles.push(...members);
      continue;
    }
    const a = members[0]!;
    const b = members[1]!;
    teams.push({
      id,
      players: [a, b],
      points: a.points + b.points,
    });
  }

  teams.sort((x, y) => y.points - x.points || x.id.localeCompare(y.id));

  const pairings: MexicanoCourtPairing[] = [];
  let court = 0;
  for (let i = 0; i + 1 < teams.length; i += 2) {
    pairings.push({
      courtIndex: court++,
      teamA: teams[i]!.players,
      teamB: teams[i + 1]!.players,
    });
  }

  const resting: MexicanoPlayer[] = [...singles];
  if (teams.length % 2 === 1) {
    resting.push(...teams[teams.length - 1]!.players);
  }
  return { pairings, resting };
}

export function planMexicanoRound(input: {
  players: MexicanoPlayer[];
  roundNumber: number;
  mode: "individual" | "team";
  courtCount: number;
}): MexicanoRoundPlan {
  const { roundNumber, mode, courtCount } = input;
  const players = [...input.players];

  if (roundNumber <= 1) {
    const shuffled = shuffle(players);
    if (mode === "team") {
      const { pairings, resting } = teamBlockPairing(shuffled);
      return {
        roundNumber,
        mode,
        pairings: pairings.slice(0, Math.max(1, courtCount)),
        resting: [
          ...resting,
          ...pairings.slice(Math.max(1, courtCount)).flatMap((p) => [...p.teamA, ...p.teamB]),
        ],
      };
    }
    const pairings = individualBlockPairing(shuffled);
    const used = pairings.slice(0, Math.max(1, courtCount));
    const unusedPlayers = shuffled.slice(used.length * 4);
    return {
      roundNumber,
      mode,
      pairings: used,
      resting: [
        ...unusedPlayers,
        ...pairings.slice(Math.max(1, courtCount)).flatMap((p) => [...p.teamA, ...p.teamB]),
      ],
    };
  }

  const ranked = [...players].sort(byPointsDesc);
  if (mode === "team") {
    const { pairings, resting } = teamBlockPairing(ranked);
    return {
      roundNumber,
      mode,
      pairings: pairings.slice(0, Math.max(1, courtCount)),
      resting: [
        ...resting,
        ...pairings.slice(Math.max(1, courtCount)).flatMap((p) => [...p.teamA, ...p.teamB]),
      ],
    };
  }

  const pairings = individualBlockPairing(ranked);
  const used = pairings.slice(0, Math.max(1, courtCount));
  const remainder = ranked.slice(used.length * 4);
  return {
    roundNumber,
    mode,
    pairings: used,
    resting: [
      ...remainder,
      ...pairings.slice(Math.max(1, courtCount)).flatMap((p) => [...p.teamA, ...p.teamB]),
    ],
  };
}

export type MexicanoLeaderboardEntry = {
  playerId: string;
  name: string;
  points: number;
  wins: number;
  losses: number;
  rank: number;
};

export function buildMexicanoLeaderboard(
  players: MexicanoPlayer[],
  results: Array<{ playerId: string; pointsDelta: number; won: boolean }>,
): MexicanoLeaderboardEntry[] {
  const map = new Map(
    players.map((p) => [
      p.id,
      { playerId: p.id, name: p.name, points: p.points, wins: 0, losses: 0 },
    ]),
  );
  for (const r of results) {
    const row = map.get(r.playerId);
    if (!row) continue;
    row.points += r.pointsDelta;
    if (r.won) row.wins += 1;
    else row.losses += 1;
  }
  return [...map.values()]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
