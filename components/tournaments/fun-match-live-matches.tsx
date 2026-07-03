"use client";

import { CheckCircle2, Radio, Swords, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LiveMatchItem = {
  id: string;
  teamAName?: string | null;
  teamBName?: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA?: number | null;
  scoreB?: number | null;
  status?: string;
  roundNumber?: number | null;
  matchNumber?: number;
  type?: string;
  playType?: string | null;
  playNumber?: number | null;
  courtId?: string | null;
};

type FunMatchLiveMatchesProps = {
  matches: LiveMatchItem[];
  className?: string;
};

function statusMeta(status: string | undefined) {
  if (status === "in_progress") {
    return { label: "Live", variant: "warning" as const, icon: Radio };
  }
  if (status === "completed") {
    return { label: "Final", variant: "success" as const, icon: CheckCircle2 };
  }
  return { label: "Scheduled", variant: "muted" as const, icon: Timer };
}

export function FunMatchLiveMatches({ matches, className }: FunMatchLiveMatchesProps) {
  if (!matches.length) return null;

  const sorted = [...matches].sort((a, b) => {
    const order = (s?: string) =>
      s === "in_progress" ? 0 : s === "completed" ? 1 : 2;
    return order(a.status) - order(b.status);
  });

  return (
    <section className={cn("rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6", className)}>
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-emerald-400" />
        <h3 className="font-semibold text-foreground">All matches</h3>
        <Badge variant="muted" className="ml-1">
          {matches.length}
        </Badge>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {sorted.map((m) => {
          const meta = statusMeta(m.status);
          const Icon = meta.icon;
          const isLive = m.status === "in_progress";
          const roundLabel =
            m.playType === "friendly"
              ? m.playNumber
                ? `Friendly #${m.playNumber}`
                : "Friendly"
              : m.playType === "bracket_rematch"
                ? m.playNumber
                  ? `Rematch #${m.playNumber}`
                  : "Rematch"
                : m.type === "bracket"
                  ? m.matchNumber
                    ? `Bracket · M${m.matchNumber}`
                    : "Bracket"
                  : m.roundNumber != null
                    ? `Round ${m.roundNumber}`
                    : "Match";

          return (
            <li
              key={m.id}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isLive
                  ? "border-amber-500/30 bg-amber-950/15"
                  : "border-cp-border bg-cp-elevated/20",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cp-muted">
                  {roundLabel}
                </span>
                <Badge variant={meta.variant} className="gap-1 capitalize">
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                <div>
                  <p className="text-sm font-semibold leading-tight text-foreground sm:text-base">
                    {m.teamAName ?? "TBD"}
                  </p>
                  {m.teamAPlayers?.length ? (
                    <p className="mt-0.5 text-[10px] text-cp-muted">{m.teamAPlayers.join(" · ")}</p>
                  ) : null}
                </div>
                <span className="font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {m.status === "completed" || m.status === "in_progress" ? (
                    <>
                      {m.scoreA ?? 0}
                      <span className="mx-1 text-cp-muted">:</span>
                      {m.scoreB ?? 0}
                    </>
                  ) : (
                    <span className="text-lg text-cp-muted">vs</span>
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight text-foreground sm:text-base">
                    {m.teamBName ?? "TBD"}
                  </p>
                  {m.teamBPlayers?.length ? (
                    <p className="mt-0.5 text-[10px] text-cp-muted">{m.teamBPlayers.join(" · ")}</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
