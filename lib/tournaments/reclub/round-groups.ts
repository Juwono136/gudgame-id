import {
  getReclubMatchHistoryKey,
  pickBetterReclubMatch,
  type ReclubMatchView,
} from "@/lib/tournaments/reclub/types";

export type FunMatchRoundGroup = {
  roundNumber: number;
  matches: ReclubMatchView[];
  liveCount: number;
  completedCount: number;
};

function roundSortKey(m: ReclubMatchView): number {
  if (m.playType === "friendly") return 10_000 + (m.playNumber ?? m.roundNumber);
  return m.roundNumber;
}

/** Collapse duplicate rows (e.g. bracket slot + reclub session record for same play). */
export function dedupeReclubMatchViews(matches: ReclubMatchView[]): ReclubMatchView[] {
  const byKey = new Map<string, ReclubMatchView>();
  for (const m of matches) {
    const key = getReclubMatchHistoryKey(m);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, m);
      continue;
    }
    byKey.set(key, pickBetterReclubMatch(existing, m));
  }
  return [...byKey.values()];
}

/** Group session matches by round number (excludes friendly unless includeFriendly). */
export function groupMatchesByRound(
  matches: ReclubMatchView[],
  options?: { includeFriendly?: boolean },
): FunMatchRoundGroup[] {
  const includeFriendly = options?.includeFriendly ?? false;
  const deduped = dedupeReclubMatchViews(matches);
  const map = new Map<number, ReclubMatchView[]>();

  for (const m of deduped) {
    if (!includeFriendly && m.playType === "friendly") continue;
    const key = m.playType === "friendly" ? 9000 + (m.playNumber ?? 0) : m.roundNumber;
    const list = map.get(key) ?? [];
    list.push(m);
    map.get(key) ?? map.set(key, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, roundMatches]) => ({
      roundNumber,
      matches: [...roundMatches].sort((a, b) => {
        const courtA = a.courtId ?? "";
        const courtB = b.courtId ?? "";
        return courtA.localeCompare(courtB) || roundSortKey(a) - roundSortKey(b);
      }),
      liveCount: roundMatches.filter((m) => m.status === "in_progress").length,
      completedCount: roundMatches.filter((m) => m.status === "completed").length,
    }));
}

export function getCurrentSessionRound(
  matches: ReclubMatchView[],
  activeMatches: ReclubMatchView[],
): number {
  const sessionMatches = (list: ReclubMatchView[]) =>
    list.filter((m) => m.playType !== "friendly");

  if (activeMatches.length > 0) {
    const rounds = [...new Set(sessionMatches(activeMatches).map((m) => m.roundNumber))];
    if (rounds.length === 1) return rounds[0]!;
    return Math.min(...rounds);
  }

  const completed = sessionMatches(matches).filter((m) => m.status === "completed");
  if (!completed.length) return 1;
  return Math.max(...completed.map((m) => m.roundNumber)) + 1;
}

export function getDistinctCompletedSessionRounds(matches: ReclubMatchView[]): number {
  return new Set(
    matches
      .filter((m) => m.status === "completed" && m.playType !== "friendly")
      .map((m) => m.roundNumber),
  ).size;
}
