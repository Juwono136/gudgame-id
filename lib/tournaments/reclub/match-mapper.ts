import type { tournamentReclubMatches } from "@/db/schema/tournament-matches";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { parseReclubMatchMetadata } from "@/lib/tournaments/reclub/score-events";

export function mapReclubMatchRow(
  row: typeof tournamentReclubMatches.$inferSelect,
): ReclubMatchView {
  const meta = parseReclubMatchMetadata(row.metadata);
  const raw = row.metadata as Record<string, unknown> | null;
  const bracketMatchId =
    typeof raw?.bracketMatchId === "string" ? raw.bracketMatchId : null;

  return {
    id: row.id,
    roundNumber: row.roundNumber,
    teamAId: row.teamAId,
    teamBId: row.teamBId,
    teamAName: row.teamAName,
    teamBName: row.teamBName,
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    durationSeconds: row.durationSeconds,
    summary: row.summary,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    courtId: row.courtId ?? null,
    timerEndsAt: row.timerEndsAt?.toISOString() ?? null,
    teamAPlayers: meta.teamAPlayers ?? [],
    teamBPlayers: meta.teamBPlayers ?? [],
    scoreEvents: meta.scoreEvents ?? [],
    sourceKind: bracketMatchId ? "bracket" : "round",
    bracketMatchId,
    roundLabel: typeof raw?.roundLabel === "string" ? raw.roundLabel : null,
  };
}
