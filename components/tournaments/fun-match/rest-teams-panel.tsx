"use client";

import { useMemo, useState } from "react";
import { Coffee, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RestTeamsPanelProps = {
  teamNames: string[];
  variant?: "official" | "fun";
  className?: string;
};

const PREVIEW_COUNT = 12;

/**
 * Teams not assigned to a fixture in the current round — readable chip grid instead of a comma wall.
 */
export function RestTeamsPanel({
  teamNames,
  variant = "official",
  className,
}: RestTeamsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(
    () => (expanded ? teamNames : teamNames.slice(0, PREVIEW_COUNT)),
    [expanded, teamNames],
  );
  const hiddenCount = Math.max(0, teamNames.length - PREVIEW_COUNT);

  if (!teamNames.length) return null;

  const accentIcon =
    variant === "official"
      ? "bg-cp-primary/12 text-cp-primary"
      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-cp-border/80 bg-linear-to-br from-cp-elevated/50 via-cp-card/40 to-cp-elevated/30 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              accentIcon,
            )}
          >
            <Coffee className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-cp-muted" aria-hidden />
              On rest this round
            </p>
            <p className="mt-0.5 text-xs text-cp-muted">
              {teamNames.length} team{teamNames.length === 1 ? "" : "s"} waiting for the next
              fixture — standby near your court when called.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-cp-border/80 bg-cp-card/80 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground">
          {teamNames.length}
        </span>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" role="list">
        {visible.map((name) => (
          <li key={name}>
            <span className="inline-flex max-w-[14rem] items-center rounded-full border border-cp-border/70 bg-cp-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-cp-primary/35 hover:bg-cp-primary/5">
              <span className="truncate">{name}</span>
            </span>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 h-8 text-xs text-cp-muted hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show fewer teams" : `Show all ${teamNames.length} teams`}
        </Button>
      ) : null}
    </div>
  );
}
