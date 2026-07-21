"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import {
  buildPointLogRows,
  describeScoreEvent,
  type PointLogMatchContext,
} from "@/lib/tournaments/scoring/event-labels";
export type { PointLogMatchContext } from "@/lib/tournaments/scoring/event-labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_VISIBLE_EVENTS = 12;

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type OfficialPointLogTimelineProps = {
  events: MatchScoreEvent[];
  matchContext?: PointLogMatchContext;
  className?: string;
  emptyMessage?: string;
  maxVisible?: number;
};

export function OfficialPointLogTimeline({
  events,
  matchContext,
  className,
  emptyMessage = "Point-by-point log will appear when scoring staff records live points.",
  maxVisible = DEFAULT_VISIBLE_EVENTS,
}: OfficialPointLogTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => buildPointLogRows(events), [events]);

  if (!rows.length) {
    return (
      <p
        className={cn(
          "rounded-xl border border-dashed border-cp-border px-4 py-6 text-center text-sm text-cp-muted",
          className,
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  const hiddenCount = Math.max(0, rows.length - maxVisible);
  const visibleRows = expanded || hiddenCount === 0 ? rows : rows.slice(-maxVisible);
  const latest = rows[rows.length - 1]!;

  return (
    <div className={cn("flex min-h-0 flex-col rounded-xl border border-cp-border/70 bg-cp-elevated/15", className)}>
      <div className="shrink-0 border-b border-cp-border/60 px-3 py-2.5 sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
          {rows.length} scoring event{rows.length === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          Latest: {describeScoreEvent(latest.event, matchContext, latest.previous)}
        </p>
      </div>

      <ol className="max-h-72 space-y-1 overflow-y-auto p-2 sm:max-h-80 sm:p-3 [scrollbar-width:thin]">
        {visibleRows.map((row, i) => (
          <li
            key={`${row.event.at}-${row.event.action}-${row.event.side ?? ""}-${row.event.scoreA}-${row.event.scoreB}-${i}`}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 rounded-lg px-2 py-1.5 text-sm hover:bg-cp-elevated/40 sm:gap-x-3 sm:px-2.5"
          >
            <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums text-cp-muted sm:text-[11px]">
              <Clock className="hidden h-3 w-3 sm:inline" />
              {formatTime(row.event.at)}
            </span>
            <span className="min-w-0 leading-snug text-foreground">
              {describeScoreEvent(row.event, matchContext, row.previous)}
            </span>
          </li>
        ))}
      </ol>

      {hiddenCount > 0 ? (
        <div className="shrink-0 border-t border-cp-border/60 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full text-xs text-cp-muted"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                Show latest {maxVisible} only
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                Show all {rows.length} events ({hiddenCount} hidden)
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
