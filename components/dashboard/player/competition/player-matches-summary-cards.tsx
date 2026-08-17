"use client";

import { Swords, Trophy } from "lucide-react";
import type { PlayerMatchListSummary } from "@/lib/account/player-competition/list-matches";
import { cn } from "@/lib/utils";

type PlayerMatchesSummaryCardsProps = {
  summary: PlayerMatchListSummary | undefined;
  isLoading?: boolean;
};

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "primary" | "emerald" | "red" | "muted";
}) {
  return (
    <div className="rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          accent === "primary" && "text-cp-primary",
          accent === "emerald" && "text-emerald-300",
          accent === "red" && "text-red-400",
          (!accent || accent === "muted") && "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-cp-muted">{sub}</p> : null}
    </div>
  );
}

export function PlayerMatchesSummaryCards({ summary, isLoading }: PlayerMatchesSummaryCardsProps) {
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[4.5rem] animate-pulse rounded-xl border border-cp-border bg-cp-elevated/40"
          />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard label="Total matches" value={summary.total} />
      <SummaryCard label="Wins" value={summary.wins} accent="primary" />
      <SummaryCard
        label="Official"
        value={summary.official}
        sub="Paid & free ranked events"
        accent="muted"
      />
      <SummaryCard
        label="Fun Match"
        value={summary.reclub}
        sub="Community sessions"
        accent="emerald"
      />
    </div>
  );
}

export function PlayerMatchesSummaryHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-cp-muted">
      <Swords className="h-3.5 w-3.5 shrink-0" />
      Official and Fun Match matches appear here after results are recorded in tournaments.
      <Trophy className="hidden h-3.5 w-3.5 sm:inline" />
    </p>
  );
}
