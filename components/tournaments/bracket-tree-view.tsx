"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import { cn } from "@/lib/utils";

type BracketTreeViewProps = {
  matches: BracketMatchView[];
  emptyMessage?: string;
  highlightTeamIds?: string[];
  onSlotClick?: (matchId: string, slot: "a" | "b") => void;
  seedingMode?: boolean;
};

export function BracketTreeView({
  matches,
  emptyMessage = "Bracket not generated yet.",
  highlightTeamIds = [],
  onSlotClick,
  seedingMode = false,
}: BracketTreeViewProps) {
  const { roundNumbers, totalRounds } = useMemo(() => {
    const nums = [...new Set(matches.map((m) => m.roundNumber))].sort((a, b) => a - b);
    const max = nums.length ? Math.max(...nums) : 0;
    return { roundNumbers: nums, totalRounds: max };
  }, [matches]);

  const rounds = useMemo(() => {
    const map = new Map<number, BracketMatchView[]>();
    for (const m of matches) {
      const list = map.get(m.roundNumber) ?? [];
      list.push(m);
      map.set(m.roundNumber, list);
    }
    return map;
  }, [matches]);

  if (!matches.length) {
    return (
      <div className="rounded-2xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-stretch gap-4 sm:gap-8">
        {roundNumbers.map((round, roundIndex) => {
          const roundMatches = (rounds.get(round) ?? []).sort(
            (a, b) => a.matchNumber - b.matchNumber,
          );
          const label = getBracketRoundLabel(round, totalRounds);

          return (
            <div key={round} className="relative flex w-60 shrink-0 flex-col sm:w-64">
              {roundIndex < roundNumbers.length - 1 ? (
                <div
                  className="pointer-events-none absolute -right-4 top-0 hidden h-full w-4 border-r border-cp-border/50 sm:block"
                  aria-hidden
                />
              ) : null}
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                {label}
              </p>
              <div
                className="flex flex-1 flex-col justify-around gap-6"
                style={{ minHeight: `${Math.max(roundMatches.length * 88, 120)}px` }}
              >
                {roundMatches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: roundIndex * 0.06 + i * 0.04 }}
                    className={cn(
                      "relative rounded-xl border bg-cp-card shadow-sm transition-shadow",
                      m.status === "completed" || m.status === "bye"
                        ? "border-emerald-500/35"
                        : m.status === "in_progress"
                          ? "border-amber-500/40 ring-1 ring-amber-500/20"
                          : "border-cp-border",
                    )}
                  >
                    <div className="absolute -left-3 top-1/2 hidden h-px w-3 -translate-y-1/2 bg-cp-border/70 sm:block" />
                    <div className="px-1 py-1">
                      <MatchSlot
                        name={m.teamAName}
                        score={m.scoreA}
                        winner={m.winnerTeamId != null && m.winnerTeamId === m.teamAId}
                        eliminated={
                          m.status === "completed" &&
                          m.winnerTeamId != null &&
                          m.winnerTeamId !== m.teamAId
                        }
                        highlighted={Boolean(m.teamAId && highlightTeamIds.includes(m.teamAId))}
                        droppable={seedingMode && m.roundNumber === 1 && m.status === "pending"}
                        onClick={
                          onSlotClick && m.roundNumber === 1 && m.status === "pending"
                            ? () => onSlotClick(m.id, "a")
                            : undefined
                        }
                      />
                      <div className="mx-2 border-t border-cp-border/60" />
                      <MatchSlot
                        name={m.teamBName}
                        score={m.scoreB}
                        winner={m.winnerTeamId != null && m.winnerTeamId === m.teamBId}
                        eliminated={
                          m.status === "completed" &&
                          m.winnerTeamId != null &&
                          m.winnerTeamId !== m.teamBId
                        }
                        highlighted={Boolean(m.teamBId && highlightTeamIds.includes(m.teamBId))}
                        droppable={seedingMode && m.roundNumber === 1 && m.status === "pending"}
                        onClick={
                          onSlotClick && m.roundNumber === 1 && m.status === "pending"
                            ? () => onSlotClick(m.id, "b")
                            : undefined
                        }
                      />
                    </div>
                    {m.status === "bye" ? (
                      <span className="absolute -top-2 right-2 rounded bg-cp-elevated px-1.5 py-0.5 text-[10px] text-cp-muted">
                        BYE
                      </span>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchSlot({
  name,
  score,
  winner,
  eliminated,
  highlighted,
  droppable,
  onClick,
}: {
  name: string | null;
  score: number | null;
  winner: boolean;
  eliminated: boolean;
  highlighted?: boolean;
  droppable?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "truncate text-sm",
          winner && "font-semibold text-emerald-300",
          eliminated && "text-cp-muted line-through decoration-cp-muted/60",
          !winner && !eliminated && "text-foreground",
        )}
      >
        {name ?? (droppable ? "Drop squad here" : "TBD")}
      </span>
      {score != null ? (
        <span className="shrink-0 tabular-nums text-xs text-cp-muted">{score}</span>
      ) : null}
    </>
  );

  const className = cn(
    "flex items-center justify-between gap-2 px-3 py-2.5 transition-colors",
    highlighted && "bg-emerald-500/10",
    droppable && "cursor-pointer hover:bg-emerald-500/5",
    eliminated && "opacity-60",
  );

  if (onClick) {
    return (
      <button type="button" className={cn(className, "w-full text-left")} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
