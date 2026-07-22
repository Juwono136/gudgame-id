/**
 * Pure layout helpers for elimination / double-stage knockout trees.
 * Play-in is rendered separately; the main tree only uses rounds ≥ 1.
 */

export type BracketTreeMatchLike = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  nextMatchId?: string | null;
};

export type BracketHalf = "all" | "upper" | "lower";

/** Main-draw rounds start at 1; 0 is double-stage play-in. */
export function isPlayInRound(roundNumber: number): boolean {
  return roundNumber <= 0;
}

export function getMainDrawRoundNumbers(matches: BracketTreeMatchLike[]): number[] {
  return [...new Set(matches.map((m) => m.roundNumber).filter((r) => r >= 1))].sort(
    (a, b) => a - b,
  );
}

export function getPlayInMatches<T extends BracketTreeMatchLike>(matches: T[]): T[] {
  return matches
    .filter((m) => isPlayInRound(m.roundNumber))
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

export function getMainDrawMatches<T extends BracketTreeMatchLike>(matches: T[]): T[] {
  return matches.filter((m) => !isPlayInRound(m.roundNumber));
}

/** Grid row count is driven by round 1 (earliest main-draw round). */
export function getMainDrawGridSlots(matches: BracketTreeMatchLike[]): number {
  const mainRounds = getMainDrawRoundNumbers(matches);
  const firstMain = mainRounds[0];
  if (firstMain == null) return 1;
  return Math.max(matches.filter((m) => m.roundNumber === firstMain).length, 1);
}

/**
 * Compact-but-readable metrics — always leave room for team + player lines.
 */
export function getBracketGridMetrics(visibleSlots: number) {
  const slots = Math.max(visibleSlots, 1);
  const rowGap = slots >= 16 ? 10 : slots >= 8 ? 12 : slots >= 4 ? 16 : 20;
  // Tall enough for match header + 2× (team name + player line) without clipping.
  const rowHeight = slots >= 16 ? 100 : slots >= 8 ? 110 : slots >= 4 ? 124 : 132;
  const columnHeight = slots * rowHeight + Math.max(slots - 1, 0) * rowGap;
  const columnWidth = slots >= 16 ? 216 : slots >= 8 ? 232 : 252;
  const gutterWidth = slots >= 16 ? 40 : slots >= 8 ? 48 : 60;
  const headerHeight = 28;

  return {
    gridSlots: slots,
    rowHeight,
    rowGap,
    columnHeight,
    columnWidth,
    gutterWidth,
    headerHeight,
    showPlayers: true,
    compactPlayers: slots >= 8,
  };
}

export function getMatchGridRow(
  roundNumber: number,
  matchNumber: number,
): { rowStart: number; span: number } {
  if (isPlayInRound(roundNumber)) {
    return { rowStart: Math.max(matchNumber, 1), span: 1 };
  }
  const index = Math.max(matchNumber, 1) - 1;
  const span = 2 ** (roundNumber - 1);
  return { rowStart: index * span + 1, span };
}

/** Place a match inside a half-bracket viewport (clamps Final / wide spans). */
export function getLocalMatchGridRow(
  roundNumber: number,
  matchNumber: number,
  rowOffset: number,
  localSlots: number,
): { rowStart: number; span: number } {
  const { rowStart, span } = getMatchGridRow(roundNumber, matchNumber);
  const localStart = rowStart - rowOffset;
  const localEnd = localStart + span - 1;

  if (localStart < 1 || localEnd > localSlots) {
    return { rowStart: 1, span: localSlots };
  }
  return { rowStart: localStart, span };
}

/** R1 slot range covered by a main-draw match. */
export function getMatchR1Range(
  roundNumber: number,
  matchNumber: number,
): { start: number; end: number } {
  const { rowStart, span } = getMatchGridRow(roundNumber, matchNumber);
  return { start: rowStart, end: rowStart + span - 1 };
}

export function getMatchCenterY(
  rowStart: number,
  span: number,
  rowHeight: number,
  rowGap: number,
): number {
  const startY = (rowStart - 1) * (rowHeight + rowGap);
  const blockHeight = span * rowHeight + Math.max(span - 1, 0) * rowGap;
  return startY + blockHeight / 2;
}

/**
 * For 8+ opening matches (Ro16 / Ro32), split into upper/lower halves
 * so vertical scroll stays short and readable.
 */
export function filterBracketHalf<T extends BracketTreeMatchLike>(
  matches: T[],
  half: BracketHalf,
  fullGridSlots: number,
): { matches: T[]; localSlots: number; rowOffset: number } {
  const main = getMainDrawMatches(matches);
  if (half === "all" || fullGridSlots < 8) {
    return { matches: main, localSlots: Math.max(fullGridSlots, 1), rowOffset: 0 };
  }

  const halfSize = fullGridSlots / 2;
  const rowOffset = half === "upper" ? 0 : halfSize;
  const rangeStart = rowOffset + 1;
  const rangeEnd = rowOffset + halfSize;

  const filtered = main.filter((m) => {
    const { start, end } = getMatchR1Range(m.roundNumber, m.matchNumber);
    return start <= rangeEnd && end >= rangeStart;
  });

  return { matches: filtered, localSlots: halfSize, rowOffset };
}

/** Opening draws with 8+ first-round matches should use half navigation. */
export function shouldSplitBracketHalf(fullGridSlots: number): boolean {
  return fullGridSlots >= 8;
}

export function getMainDrawTotalRounds(matches: BracketTreeMatchLike[]): number {
  const main = getMainDrawRoundNumbers(matches);
  return main.length ? Math.max(...main) : 0;
}

export type BracketMatchAnchor = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  nextMatchId?: string | null;
  columnIndex: number;
  centerX: number;
  centerY: number;
  left: number;
  right: number;
};

export function buildBracketMatchAnchors(
  matches: BracketTreeMatchLike[],
  roundNumbers: number[],
  metrics: ReturnType<typeof getBracketGridMetrics>,
  rowOffset = 0,
): BracketMatchAnchor[] {
  const { rowHeight, rowGap, columnWidth, gutterWidth, headerHeight, gridSlots } = metrics;
  const anchors: BracketMatchAnchor[] = [];

  roundNumbers.forEach((round, columnIndex) => {
    const left = columnIndex * (columnWidth + gutterWidth);
    const centerX = left + columnWidth / 2;
    const roundMatches = matches
      .filter((m) => m.roundNumber === round)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    for (const m of roundMatches) {
      const { rowStart, span } = getLocalMatchGridRow(
        m.roundNumber,
        m.matchNumber,
        rowOffset,
        gridSlots,
      );
      const centerY = headerHeight + getMatchCenterY(rowStart, span, rowHeight, rowGap);
      anchors.push({
        id: m.id,
        roundNumber: m.roundNumber,
        matchNumber: m.matchNumber,
        nextMatchId: m.nextMatchId,
        columnIndex,
        centerX,
        centerY,
        left,
        right: left + columnWidth,
      });
    }
  });

  return anchors;
}

export function buildLayoutBracketPaths(anchors: BracketMatchAnchor[]): string[] {
  const byRound = new Map<number, BracketMatchAnchor[]>();
  for (const a of anchors) {
    const list = byRound.get(a.roundNumber) ?? [];
    list.push(a);
    byRound.set(a.roundNumber, list);
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const paths: string[] = [];

  for (let i = 0; i < rounds.length - 1; i++) {
    const cur = byRound.get(rounds[i]!) ?? [];
    const next = byRound.get(rounds[i + 1]!) ?? [];

    for (const target of next) {
      let feeders = cur.filter((m) => m.nextMatchId === target.id);
      if (!feeders.length) {
        const slot = target.matchNumber - 1;
        feeders = cur.filter(
          (m) => m.matchNumber === slot * 2 + 1 || m.matchNumber === slot * 2 + 2,
        );
      }
      if (!feeders.length) continue;

      paths.push(
        ...buildRoundedForkPaths(
          feeders.map((f) => ({ x: f.right, y: f.centerY })),
          { x: target.left, y: target.centerY },
        ),
      );
    }
  }

  return paths;
}

/** Clean bracket elbows with slight corner radius (no overlapping segment seams). */
export function buildRoundedForkPaths(
  feeders: Array<{ x: number; y: number }>,
  target: { x: number; y: number },
  radius = 6,
): string[] {
  if (!feeders.length) return [];

  const sorted = [...feeders].sort((a, b) => a.y - b.y);
  const joinX = snap((sorted[0]!.x + target.x) / 2);
  const tx = snap(target.x);
  const ty = snap(target.y);

  if (sorted.length === 1) {
    const f = sorted[0]!;
    return [roundedOrthoPath(snap(f.x), snap(f.y), joinX, ty, tx, ty, radius)];
  }

  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;
  const topX = snap(top.x);
  const topY = snap(top.y);
  const botX = snap(bottom.x);
  const botY = snap(bottom.y);

  // One continuous “⊐” fork into the next match — reads cleaner than 4 separate strokes.
  const r = Math.min(radius, Math.abs(botY - topY) / 4, Math.abs(joinX - topX) / 2, Math.abs(tx - joinX) / 2);
  const paths: string[] = [];

  if (r < 1.5) {
    paths.push(`M ${topX} ${topY} H ${joinX} V ${botY} H ${botX}`);
    paths.push(`M ${joinX} ${ty} H ${tx}`);
    return paths;
  }

  // Top feeder → join column (rounded)
  paths.push(
    `M ${topX} ${topY} H ${joinX - r} Q ${joinX} ${topY} ${joinX} ${topY + r} V ${ty}`,
  );
  // Bottom feeder → join column (rounded), then stem already at ty from first path if ty between
  paths.push(
    `M ${botX} ${botY} H ${joinX - r} Q ${joinX} ${botY} ${joinX} ${botY - r} V ${ty}`,
  );
  // Stem into next match
  paths.push(`M ${joinX} ${ty} H ${tx}`);

  return paths;
}

function roundedOrthoPath(
  x1: number,
  y1: number,
  viaX: number,
  viaY: number,
  x2: number,
  y2: number,
  radius: number,
): string {
  if (Math.abs(y1 - viaY) < 1 && Math.abs(viaY - y2) < 1) {
    return `M ${x1} ${y1} H ${x2}`;
  }
  const r = Math.min(
    radius,
    Math.abs(viaX - x1) / 2,
    Math.abs(viaY - y1) / 2,
    Math.abs(x2 - viaX) / 2,
  );
  if (r < 1.5) {
    return `M ${x1} ${y1} H ${viaX} V ${viaY} H ${x2}`;
  }
  const sy = viaY >= y1 ? 1 : -1;
  return `M ${x1} ${y1} H ${viaX - r} Q ${viaX} ${y1} ${viaX} ${y1 + sy * r} V ${viaY} H ${x2}`;
}

function snap(v: number): number {
  return Math.round(v * 2) / 2;
}
