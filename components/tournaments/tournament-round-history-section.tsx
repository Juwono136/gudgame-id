"use client";

import { History, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RoundHistoryItem = {
  id: string;
  roundLabel: string;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  type?: "bracket" | "lobby_round" | "americano_round";
};

type TournamentRoundHistorySectionProps = {
  items: RoundHistoryItem[];
  variant?: "official" | "reclub";
  title?: string;
  emptyMessage?: string;
};

function winnerSide(item: RoundHistoryItem): "a" | "b" | "tie" | null {
  if (item.status !== "completed") return null;
  const a = item.scoreA ?? 0;
  const b = item.scoreB ?? 0;
  if (a > b) return "a";
  if (b > a) return "b";
  return "tie";
}

export function TournamentRoundHistorySection({
  items,
  variant = "official",
  title = "Round history",
  emptyMessage = "Completed matches will appear here with scores and round labels.",
}: TournamentRoundHistorySectionProps) {
  const accent = variant === "official" ? "text-cp-primary" : "text-emerald-400";
  const borderAccent =
    variant === "official" ? "border-cp-primary/25" : "border-emerald-500/25";

  const sorted = [...items].sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;
    return 0;
  });

  if (!sorted.length) {
    return (
      <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/50 p-6 text-center sm:p-8">
        <History className="mx-auto h-8 w-8 text-cp-muted/50" />
        <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-cp-muted">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <History className={cn("h-4 w-4", accent)} />
          {title}
        </h3>
        <Badge variant="muted">{sorted.length} match{sorted.length === 1 ? "" : "es"}</Badge>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {sorted.map((item) => {
          const winner = winnerSide(item);
          const isLive = item.status === "in_progress";

          return (
            <li
              key={item.id}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-gradient-to-br from-cp-elevated/40 to-cp-card p-4 transition-shadow hover:shadow-md",
                isLive ? borderAccent : "border-cp-border/80",
              )}
            >
              {isLive ? (
                <span className="absolute right-3 top-3 rounded-full border border-red-500/30 bg-red-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200">
                  Live
                </span>
              ) : item.status === "completed" ? (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                  <Trophy className="h-3 w-3" />
                  Final
                </span>
              ) : null}

              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                {item.roundLabel}
              </p>

              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <p
                  className={cn(
                    "truncate text-sm font-semibold",
                    winner === "a" ? "text-foreground" : "text-cp-muted",
                  )}
                >
                  {item.teamAName ?? "TBD"}
                </p>
                <div className="rounded-lg border border-cp-border/80 bg-cp-elevated/60 px-3 py-1.5 text-center">
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {item.scoreA ?? 0}
                    <span className="mx-1 text-cp-muted">:</span>
                    {item.scoreB ?? 0}
                  </p>
                </div>
                <p
                  className={cn(
                    "truncate text-right text-sm font-semibold",
                    winner === "b" ? "text-foreground" : "text-cp-muted",
                  )}
                >
                  {item.teamBName ?? "TBD"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
