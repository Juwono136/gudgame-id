"use client";

import { Trophy, UserPlus } from "lucide-react";
import { FunMatchStatsLegend } from "@/components/tournaments/fun-match/fun-match-stats-legend";
import type { FunMatchPlayerLeaderboardRow } from "@/lib/tournaments/stats/fun-match-player-stats";
import { cn } from "@/lib/utils";

type FunMatchLeaderboardProps = {
  rows: FunMatchPlayerLeaderboardRow[];
  className?: string;
  compact?: boolean;
};

export function FunMatchLeaderboard({ rows, className, compact }: FunMatchLeaderboardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-2xl border border-cp-border bg-cp-card",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-cp-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-foreground sm:text-base">Leaderboard</h3>
        </div>
        <span className="text-xs text-cp-muted">{rows.length} players</span>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <UserPlus className="h-8 w-8 text-cp-muted/50" />
          <p className="text-sm text-cp-muted">Stats appear after the first match is finalized.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-cp-card/95 backdrop-blur-sm">
              <tr className="border-b border-cp-border text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-[11px]">
                <th className="px-3 py-2 sm:px-4">#</th>
                <th className="px-2 py-2">Player</th>
                {!compact ? <th className="hidden px-2 py-2 text-center sm:table-cell">G</th> : null}
                <th className="px-2 py-2 text-center">W-L-T</th>
                <th className="px-2 py-2 text-center">DIFF</th>
                <th className="px-3 py-2 text-right sm:px-4">P</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.userId}
                  className={cn(
                    "border-b border-cp-border/60 transition-colors last:border-0",
                    idx === 0 && "bg-amber-500/5",
                  )}
                >
                  <td className="px-3 py-2.5 font-medium tabular-nums text-cp-muted sm:px-4">
                    {idx + 1}
                  </td>
                  <td className="max-w-[7rem] truncate px-2 py-2.5 sm:max-w-none">
                    <span className="font-medium text-foreground">{row.name}</span>
                    {!compact ? (
                      <span className="mt-0.5 block truncate text-[10px] text-cp-muted sm:text-[11px]">
                        {row.teamName}
                      </span>
                    ) : null}
                  </td>
                  {!compact ? (
                    <td className="hidden px-2 py-2.5 text-center tabular-nums sm:table-cell">
                      {row.games}
                    </td>
                  ) : null}
                  <td className="px-2 py-2.5 text-center tabular-nums text-cp-muted">
                    {row.wins}-{row.losses}-{row.ties}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 text-center tabular-nums font-medium",
                      row.diff > 0
                        ? "text-emerald-400"
                        : row.diff < 0
                          ? "text-red-400"
                          : "text-cp-muted",
                    )}
                  >
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums text-foreground sm:px-4">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="border-t border-cp-border px-4 py-2 sm:px-5">
        <FunMatchStatsLegend compact />
      </footer>
    </section>
  );
}
