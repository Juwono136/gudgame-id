import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

/** Map live API match rows to reclub views (shared by public tabs & overview). */
export function liveMatchesToReclubViews(liveData: TournamentLivePayload): ReclubMatchView[] {
  return (liveData.matches ?? []).map((m) => ({
    id: m.id,
    roundNumber: m.roundNumber ?? 1,
    roundLabel: m.roundLabel ?? null,
    teamAName: m.teamAName ?? null,
    teamBName: m.teamBName ?? null,
    scoreA: m.scoreA ?? null,
    scoreB: m.scoreB ?? null,
    durationSeconds: m.durationSeconds ?? null,
    summary: null,
    status: m.status ?? "scheduled",
    startedAt: m.startedAt ?? null,
    endedAt: m.endedAt ?? null,
    courtId: m.courtId ?? null,
    timerEndsAt: m.timerEndsAt ?? null,
    teamAPlayers: m.teamAPlayers ?? [],
    teamBPlayers: m.teamBPlayers ?? [],
    scoreEvents: [],
    playType: m.playType as ReclubMatchView["playType"],
    playNumber: m.playNumber ?? null,
    sourceKind: m.type === "bracket" ? "bracket" : "round",
    teamAId: m.teamAId ?? null,
    teamBId: m.teamBId ?? null,
    bracketMatchId: m.bracketMatchId ?? null,
  }));
}
