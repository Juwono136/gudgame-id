"use client";

import { motion } from "framer-motion";
import type { LeaderboardEntry } from "@/lib/tournaments/brackets/leaderboard";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type PlayerPerformanceTableProps = {
  entries: LeaderboardEntry[];
  title?: string;
};

export function PlayerPerformanceTable({
  entries,
  title = "Team performance",
}: PlayerPerformanceTableProps) {
  if (!entries.length) return null;

  return (
    <section className="rounded-2xl border border-cp-border bg-cp-card p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-cp-muted">
            <tr>
              <th className="pb-3 pr-4">Rank</th>
              <th className="pb-3 pr-4">Team</th>
              <th className="pb-3 pr-4 text-right">Points</th>
              <th className="pb-3 pr-4 text-center">W–L</th>
              <th className="pb-3 pr-4 text-right">Win%</th>
              <th className="pb-3 text-center">Form</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <motion.tr
                key={e.teamId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-t border-cp-border/50"
              >
                <td className="py-3 pr-4 font-bold text-cp-primary">{e.rank}</td>
                <td className="py-3 pr-4 font-medium">{e.teamName}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{e.points}</td>
                <td className="py-3 pr-4 text-center tabular-nums text-cp-muted">
                  {e.wins}–{e.losses}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{e.winRate}%</td>
                <td className="py-3">
                  <div className="flex justify-center gap-0.5">
                    {e.form.map((f, j) => (
                      <span
                        key={j}
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                          f === "W" ? statusBadgeClass.success : statusBadgeClass.danger,
                        )}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
