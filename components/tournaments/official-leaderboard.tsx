"use client";

import { motion } from "framer-motion";
import type { LeaderboardEntry } from "@/lib/tournaments/brackets/leaderboard";
import { cn } from "@/lib/utils";

type OfficialLeaderboardProps = {
  entries: LeaderboardEntry[];
};

export function OfficialLeaderboard({ entries }: OfficialLeaderboardProps) {
  if (!entries.length) {
    return (
      <p className="py-8 text-center text-sm text-cp-muted">
        Leaderboard appears after bracket matches are played.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-cp-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-cp-border bg-cp-elevated/50 text-xs uppercase tracking-wider text-cp-muted">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3 text-right">Points</th>
            <th className="px-4 py-3 text-center">W–L</th>
            <th className="px-4 py-3 text-right">Win rate</th>
            <th className="px-4 py-3 text-center">Form (L5)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <motion.tr
              key={e.teamId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-cp-border/50 last:border-0"
            >
              <td className="px-4 py-3 font-bold text-cp-primary">{e.rank}</td>
              <td className="px-4 py-3 font-medium text-foreground">{e.teamName}</td>
              <td className="px-4 py-3 text-right tabular-nums">{e.points.toLocaleString()}</td>
              <td className="px-4 py-3 text-center tabular-nums text-cp-muted">
                {e.wins} – {e.losses}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{e.winRate}%</td>
              <td className="px-4 py-3">
                <div className="flex justify-center gap-1">
                  {e.form.map((f, j) => (
                    <span
                      key={j}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                        f === "W"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300",
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
  );
}
