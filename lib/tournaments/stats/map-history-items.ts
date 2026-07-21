import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

export type HistoryRoundItem = {
  id: string;
  roundLabel: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA: number;
  scoreB: number;
  status: string;
  type?: "bracket" | "lobby_round" | "americano_round" | "group_stage";
};

export type LiveHistoryEntry = {
  id: string;
  label: string;
  summary?: string | null;
  score: string;
  playType?: string | null;
  teamAName?: string | null;
  teamBName?: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
};

function parseScorePair(score: string): [number, number] {
  const parts = score.split(/[–-]/).map((s) => Number(s.trim()) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0];
}

export function mapLiveHistoryToRoundItems(entries: LiveHistoryEntry[]): HistoryRoundItem[] {
  return entries.map((m) => {
    const [scoreA, scoreB] = parseScorePair(m.score);
    const isGroup =
      m.playType === "group_stage" || /group/i.test(m.label ?? "");
    return {
      id: m.id,
      roundLabel: m.label,
      teamAName: m.teamAName ?? m.summary?.split(" vs ")?.[0]?.trim() ?? null,
      teamBName: m.teamBName ?? m.summary?.split(" vs ")?.[1]?.trim() ?? null,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      scoreA,
      scoreB,
      status: "completed",
      type: m.playType === "bracket" ? "bracket" : isGroup ? "group_stage" : "lobby_round",
    };
  });
}

export function mapBracketMatchesToHistoryItems(
  matches: BracketMatchView[],
): HistoryRoundItem[] {
  const maxRound = matches.length ? Math.max(...matches.map((m) => m.roundNumber)) : 1;
  return matches
    .filter((m) => m.status === "completed" && (m.teamAName || m.teamBName))
    .map((m) => ({
      id: m.id,
      roundLabel: `Bracket — ${getBracketRoundLabel(m.roundNumber, maxRound)}, Match ${m.matchNumber}`,
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      scoreA: m.scoreA ?? 0,
      scoreB: m.scoreB ?? 0,
      status: "completed",
      type: "bracket" as const,
    }));
}

export function mapReclubMatchesToHistoryItems(
  matches: ReclubMatchView[],
): HistoryRoundItem[] {
  return matches
    .filter((m) => m.status === "completed")
    .map((m) => {
      const isGroup =
        m.sourceKind === "group_stage" ||
        m.playType === "group_stage" ||
        /group/i.test(m.roundLabel ?? "");
      return {
        id: m.id,
        roundLabel: m.roundLabel ?? `Round ${m.roundNumber}`,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        teamAPlayers: m.teamAPlayers ?? [],
        teamBPlayers: m.teamBPlayers ?? [],
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
        status: "completed",
        type: isGroup ? ("group_stage" as const) : ("lobby_round" as const),
      };
    });
}

export function mergeHistoryItems(...groups: HistoryRoundItem[][]): HistoryRoundItem[] {
  const seen = new Set<string>();
  const merged: HistoryRoundItem[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}
