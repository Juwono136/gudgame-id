/**
 * Dry-run roster for Bestie Cup 2026 partner seed.
 * Pool A uses names from the official PDF walkover examples; remaining pools use
 * synthetic Women's Doubles pairs aligned to the 16×3 draw structure.
 */
export type BestieCupFixturePair = {
  /** 1–48 global pair index */
  pairIndex: number;
  /** Official pool letter A–P (for operator reference / registration notes) */
  pool: string;
  player1: string;
  player2: string;
  teamName: string;
};

const POOL_LETTERS = "ABCDEFGHIJKLMNOP".split("");

/** PDF §7 walkover examples — Pool A reference pairs */
const POOL_A_FIXED: ReadonlyArray<readonly [string, string]> = [
  ["Sinta", "Eka"],
  ["Arin", "Indri"],
  ["Voni", "Septi"],
];

const SYNTHETIC_FIRST_NAMES = [
  "Ayu",
  "Bella",
  "Citra",
  "Dewi",
  "Elina",
  "Fitri",
  "Gita",
  "Hana",
  "Indah",
  "Jihan",
  "Kartika",
  "Lia",
  "Maya",
  "Nadia",
  "Ovi",
  "Putri",
  "Rani",
  "Sari",
  "Tika",
  "Uli",
  "Vera",
  "Wulan",
  "Yuni",
  "Zara",
  "Amelia",
  "Bunga",
  "Cinta",
  "Dina",
  "Eka",
  "Farah",
  "Gina",
  "Hesti",
  "Ika",
  "Jessica",
  "Kirana",
  "Lestari",
  "Mira",
  "Novi",
  "Olivia",
  "Puspita",
  "Queena",
  "Rina",
  "Siska",
  "Tari",
  "Umi",
  "Vina",
  "Winda",
  "Yola",
  "Zahra",
  "Anisa",
  "Beth",
  "Caca",
  "Diah",
  "Elin",
  "Fira",
  "Grace",
  "Helen",
  "Intan",
  "Julia",
  "Kiki",
  "Lina",
  "Monica",
  "Nita",
  "Ocha",
  "Pia",
  "Ria",
  "Sela",
  "Tania",
  "Uci",
  "Via",
  "Wati",
  "Yuli",
  "Zita",
  "Adelia",
  "Beryl",
  "Clara",
  "Dara",
  "Elsa",
  "Fanny",
  "Gloria",
  "Hilda",
  "Ines",
  "Joanna",
  "Kezia",
  "Laras",
  "Melati",
  "Nia",
  "Olive",
  "Pratiwi",
  "Qonita",
  "Reva",
  "Salma",
  "Tasya",
  "Utami",
  "Vania",
  "Widya",
  "Yessi",
  "Zelda",
] as const;

function pairName(p1: string, p2: string): string {
  return `${p1} / ${p2}`;
}

function buildSyntheticPoolPairs(poolLetter: string, startNameIndex: number): {
  pairs: BestieCupFixturePair[];
  nextNameIndex: number;
} {
  const pairs: BestieCupFixturePair[] = [];
  let nameIdx = startNameIndex;

  for (let slot = 0; slot < 3; slot += 1) {
    const p1 = SYNTHETIC_FIRST_NAMES[nameIdx % SYNTHETIC_FIRST_NAMES.length]!;
    nameIdx += 1;
    const p2 = SYNTHETIC_FIRST_NAMES[nameIdx % SYNTHETIC_FIRST_NAMES.length]!;
    nameIdx += 1;

    pairs.push({
      pairIndex: 0,
      pool: poolLetter,
      player1: p1,
      player2: p2,
      teamName: pairName(p1, p2),
    });
  }

  return { pairs, nextNameIndex: nameIdx };
}

/** 48 pairs · 16 pools × 3 — mirrors Bestie Cup draw capacity. */
export function buildBestieCupFixtureRoster(): BestieCupFixturePair[] {
  const roster: BestieCupFixturePair[] = [];
  let nameIdx = 0;

  for (const pool of POOL_LETTERS) {
    if (pool === "A") {
      for (const [p1, p2] of POOL_A_FIXED) {
        roster.push({
          pairIndex: 0,
          pool,
          player1: p1,
          player2: p2,
          teamName: pairName(p1, p2),
        });
      }
      continue;
    }

    const built = buildSyntheticPoolPairs(pool, nameIdx);
    nameIdx = built.nextNameIndex;
    roster.push(...built.pairs);
  }

  if (roster.length !== 48) {
    throw new Error(`Bestie Cup fixture roster must have 48 pairs, got ${roster.length}`);
  }

  return roster.map((row, index) => ({ ...row, pairIndex: index + 1 }));
}

export const BESTIE_CUP_FIXTURE_PAIR_COUNT = 48;
