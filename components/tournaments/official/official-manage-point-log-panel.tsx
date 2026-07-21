"use client";

import { useMemo, useState } from "react";
import { ListOrdered } from "lucide-react";
import {
  OfficialPointLogTimeline,
  type PointLogMatchContext,
} from "@/components/tournaments/official/official-point-log-timeline";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import { buildPointLogRows } from "@/lib/tournaments/scoring/event-labels";
import { cn } from "@/lib/utils";

type LoggedMatch = {
  id: string;
  label: string;
  sublabel: string;
  events: MatchScoreEvent[];
  context: PointLogMatchContext;
};

function buildMatchContext(
  match: Pick<
    BracketMatchView | ReclubMatchView,
    "teamAName" | "teamBName" | "teamAPlayers" | "teamBPlayers"
  >,
): PointLogMatchContext {
  return {
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamAPlayers: match.teamAPlayers ?? [],
    teamBPlayers: match.teamBPlayers ?? [],
  };
}

type OfficialManagePointLogPanelProps = {
  bracketMatches: BracketMatchView[];
  reclubMatches: ReclubMatchView[];
  categoryLabel?: string | null;
};

export function OfficialManagePointLogPanel({
  bracketMatches,
  reclubMatches,
  categoryLabel,
}: OfficialManagePointLogPanelProps) {
  const loggedMatches = useMemo((): LoggedMatch[] => {
    const rows: LoggedMatch[] = [];
    for (const m of bracketMatches) {
      const displayCount = buildPointLogRows(m.scoreEvents ?? []).length;
      if (!displayCount) continue;
      rows.push({
        id: m.id,
        label: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
        sublabel: `Bracket — Round ${m.roundNumber}, Match ${m.matchNumber}`,
        events: m.scoreEvents ?? [],
        context: buildMatchContext(m),
      });
    }
    for (const m of reclubMatches) {
      const displayCount = buildPointLogRows(m.scoreEvents ?? []).length;
      if (!displayCount) continue;
      rows.push({
        id: m.id,
        label: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
        sublabel: m.roundLabel ?? `Round ${m.roundNumber}`,
        events: m.scoreEvents ?? [],
        context: buildMatchContext(m),
      });
    }
    return rows.sort((a, b) => {
      const aLast = buildPointLogRows(a.events).at(-1)?.event.at ?? "";
      const bLast = buildPointLogRows(b.events).at(-1)?.event.at ?? "";
      return bLast.localeCompare(aLast);
    });
  }, [bracketMatches, reclubMatches]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = loggedMatches.find((m) => m.id === selectedId) ?? loggedMatches[0] ?? null;

  return (
    <section className="rounded-2xl border border-cp-primary/20 bg-cp-card p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <ListOrdered className="h-4 w-4 text-cp-primary" />
        Official point log
      </h3>
        <p className="mt-1 text-sm text-cp-muted">
          Points scored with player, team, time, and resulting score
          {categoryLabel ? (
            <>
              {" "}
              <span className="text-foreground/80">({categoryLabel})</span>
            </>
          ) : null}
          . Score reductions are not listed.
        </p>

      {loggedMatches.length === 0 ? (
        <div className="mt-4">
          <OfficialPointLogTimeline events={[]} />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {loggedMatches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    selected?.id === m.id
                      ? "border-cp-primary/40 bg-cp-primary/10"
                      : "border-cp-border/70 hover:bg-cp-elevated/30",
                  )}
                >
                  <span className="font-medium text-foreground">{m.label}</span>
                  <span className="mt-0.5 block text-xs text-cp-muted">{m.sublabel}</span>
                  <span className="mt-0.5 block text-[11px] tabular-nums text-cp-muted">
                    {buildPointLogRows(m.events).length} scoring events
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <OfficialPointLogTimeline
            events={selected?.events ?? []}
            matchContext={selected?.context}
          />
        </div>
      )}
    </section>
  );
}
