"use client";

import { useMemo } from "react";
import { ListOrdered } from "lucide-react";
import {
  groupMatchesByOrderOfPlay,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import { cn } from "@/lib/utils";

type DisplayOrderOfPlayStripProps = {
  matches: ScheduleMatchRow[];
  className?: string;
};

/**
 * Compact Now / Next / Later lane for venue TV displays (partner + Gud Game).
 */
export function DisplayOrderOfPlayStrip({
  matches,
  className,
}: DisplayOrderOfPlayStripProps) {
  const buckets = useMemo(() => groupMatchesByOrderOfPlay(matches), [matches]);
  const visible = buckets.filter(
    (b) => b.key !== "done" && b.matches.length > 0,
  );

  if (!visible.length) return null;

  return (
    <aside
      className={cn(
        "w-full border-b border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm sm:px-4",
        className,
      )}
      aria-label="Order of Play"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
        <ListOrdered className="h-3.5 w-3.5" />
        Order of Play
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {visible.map((bucket) => (
          <div key={bucket.key} className="min-w-[10rem] shrink-0">
            <p
              className={cn(
                "mb-1 text-[10px] font-bold uppercase tracking-wide",
                bucket.key === "now" && "text-amber-300",
                bucket.key === "next" && "text-sky-300",
                bucket.key === "later" && "text-white/50",
              )}
            >
              {bucket.label}
            </p>
            <ul className="space-y-1">
              {bucket.matches.slice(0, 3).map((m) => (
                <li
                  key={m.id}
                  className="truncate rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/90"
                >
                  {m.playOrder != null ? (
                    <span className="mr-1 tabular-nums text-white/50">#{m.playOrder}</span>
                  ) : null}
                  <span className="font-medium">
                    {m.teamAName ?? "TBD"} vs {m.teamBName ?? "TBD"}
                  </span>
                  {m.courtName ? (
                    <span className="ml-1 text-white/45">· {m.courtName}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
