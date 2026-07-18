"use client";

import { History, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPlayerNameList } from "@/lib/format/player-names";

export type RoundHistoryItem = {
  id: string;
  roundLabel: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
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
  /** When true, scores are game wins (race-to-N), not flat points. */
  gamesScoreMode?: boolean;
};

function winnerSide(item: RoundHistoryItem): "a" | "b" | "tie" | null {
  if (item.status !== "completed") return null;
  const a = item.scoreA ?? 0;
  const b = item.scoreB ?? 0;
  if (a > b) return "a";
  if (b > a) return "b";
  return "tie";
}

function TeamBlock({
  name,
  players,
  align,
  winner,
}: {
  name: string | null;
  players?: string[];
  align: "left" | "right";
  winner: boolean;
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p
        className={cn(
          "text-sm font-semibold leading-snug",
          winner ? "text-foreground" : "text-cp-muted",
        )}
      >
        {name ?? "TBD"}
      </p>
      {players?.length ? (
        <p className="mt-0.5 text-[11px] leading-relaxed text-cp-muted">
          {formatPlayerNameList(players)}
        </p>
      ) : null}
    </div>
  );
}

export function TournamentRoundHistorySection({
  items,
  variant = "official",
  title = "Round history",
  emptyMessage = "Completed matches will appear here with scores and round labels.",
  gamesScoreMode = false,
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
        <Badge variant="muted">
          {sorted.length} match{sorted.length === 1 ? "" : "es"}
        </Badge>
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

              <p className="pr-16 text-[10px] font-semibold uppercase leading-snug tracking-wider text-cp-muted">
                {item.roundLabel}
              </p>

              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-3">
                <TeamBlock
                  name={item.teamAName}
                  players={item.teamAPlayers}
                  align="left"
                  winner={winner === "a"}
                />
                <div className="rounded-lg border border-cp-border/80 bg-cp-elevated/60 px-2.5 py-1.5 text-center sm:px-3">
                  <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                    {item.scoreA ?? 0}
                    <span className="mx-1 text-cp-muted">–</span>
                    {item.scoreB ?? 0}
                  </p>
                  {gamesScoreMode ? (
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-cp-muted">
                      Games
                    </p>
                  ) : null}
                </div>
                <TeamBlock
                  name={item.teamBName}
                  players={item.teamBPlayers}
                  align="right"
                  winner={winner === "b"}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
