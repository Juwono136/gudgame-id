import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { reconcileMatchGamesScores } from "@/lib/tournaments/scoring/game-mode";

export type StartableGroupFixture = GroupMatchView & {
  groupName: string;
};

export function groupHistoryEntryToReclubView(entry: {
  id: string;
  summary?: string | null;
  score?: string;
  endedAt?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  teamAName?: string | null;
  teamBName?: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreEvents?: MatchScoreEvent[];
  label?: string;
}): ReclubMatchView {
  const scoreParts = entry.score?.split(/[–-]/).map((s) => s.trim()) ?? ["0", "0"];
  const scoreA = Number.parseInt(scoreParts[0] ?? "0", 10) || 0;
  const scoreB = Number.parseInt(scoreParts[1] ?? "0", 10) || 0;
  return {
    id: entry.id,
    roundNumber: 1,
    teamAId: entry.teamAId ?? null,
    teamBId: entry.teamBId ?? null,
    teamAName: entry.teamAName ?? null,
    teamBName: entry.teamBName ?? null,
    scoreA,
    scoreB,
    durationSeconds: null,
    summary: entry.summary ?? null,
    status: "completed",
    startedAt: null,
    endedAt: entry.endedAt ?? null,
    courtId: null,
    timerEndsAt: null,
    teamAPlayers: entry.teamAPlayers ?? [],
    teamBPlayers: entry.teamBPlayers ?? [],
    scoreEvents: entry.scoreEvents ?? [],
    sourceKind: "group_stage",
    playType: "group_stage",
    roundLabel: entry.label ?? "Group stage",
  };
}

export function groupMatchToReclubView(
  match: GroupMatchView,
  groupName?: string,
): ReclubMatchView {
  const reconciled = reconcileMatchGamesScores(
    match.scoreA,
    match.scoreB,
    match.gameState,
  );
  return {
    id: match.id,
    roundNumber: 1,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    scoreA: reconciled.scoreA,
    scoreB: reconciled.scoreB,
    durationSeconds: null,
    summary: groupName
      ? `${groupName} · ${match.teamAName} vs ${match.teamBName}`
      : `${match.teamAName} vs ${match.teamBName}`,
    status: match.status,
    startedAt: match.startedAt,
    endedAt: match.completedAt,
    courtId: match.courtId,
    timerEndsAt: null,
    teamAPlayers: match.teamAPlayers.map((p) => p.displayName).filter(Boolean),
    teamBPlayers: match.teamBPlayers.map((p) => p.displayName).filter(Boolean),
    scoreEvents: match.scoreEvents ?? [],
    sourceKind: "group_stage",
    playType: "group_stage",
    roundLabel: groupName ?? "Group stage",
    gameState: match.gameState ?? null,
  };
}

export function formatGroupFixtureLabel(fixture: StartableGroupFixture): string {
  return `${fixture.groupName} · M${fixture.matchNumber}: ${fixture.teamAName} vs ${fixture.teamBName}`;
}
