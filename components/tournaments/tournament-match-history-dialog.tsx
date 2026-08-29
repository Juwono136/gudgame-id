"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, ListOrdered, Swords, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  OfficialPointLogTimeline,
  type PointLogMatchContext,
} from "@/components/tournaments/official/official-point-log-timeline";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import { formatStatDuration } from "@/lib/tournaments/stats/compute";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import { buildPointLogRows, describeScoreEvent } from "@/lib/tournaments/scoring/event-labels";

export type TournamentMatchHistoryTarget = {
  id: string;
  kind: "bracket" | "reclub" | "group";
  label: string;
  sublabel: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers: string[];
  teamBPlayers: string[];
  scoreA: number | null;
  scoreB: number | null;
  durationSeconds: number | null;
  scoreEvents?: MatchScoreEvent[];
};

type TournamentMatchHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: TournamentMatchHistoryTarget | null;
  sportSlug?: string;
  tournamentSlug?: string;
};

function buildContext(match: TournamentMatchHistoryTarget): PointLogMatchContext {
  return {
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamAPlayers: match.teamAPlayers,
    teamBPlayers: match.teamBPlayers,
  };
}

export function TournamentMatchHistoryDialog({
  open,
  onOpenChange,
  match,
  sportSlug,
  tournamentSlug,
}: TournamentMatchHistoryDialogProps) {
  const [auditEvents, setAuditEvents] = useState<MatchScoreEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!open || !match || !sportSlug || !tournamentSlug) {
      setAuditEvents([]);
      return;
    }
    let cancelled = false;
    setAuditLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${sportSlug}/${tournamentSlug}/manage/score-revisions`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: { eventsByMatchId?: Record<string, MatchScoreEvent[]> };
        };
        if (!cancelled) {
          setAuditEvents(json.data?.eventsByMatchId?.[match.id] ?? []);
        }
      } catch {
        if (!cancelled) setAuditEvents([]);
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, match, sportSlug, tournamentSlug]);

  const mergedEvents = useMemo(() => {
    if (!match) return [];
    return [...(match.scoreEvents ?? []), ...auditEvents];
  }, [match, auditEvents]);

  const pointRows = useMemo(
    () => buildPointLogRows(mergedEvents, { includeAudit: true }),
    [mergedEvents],
  );

  const serviceEvents = useMemo(
    () => pointRows.filter((row) => row.event.scorerName),
    [pointRows],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,52rem)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden border-cp-border bg-cp-card p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-2 border-b border-cp-border px-4 py-4 text-left sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-start gap-2 pr-2 text-lg leading-snug">
                <Swords className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
                <span>{match?.label ?? "Match history"}</span>
              </DialogTitle>
              <DialogDescription>{match?.sublabel ?? "Score and service log"}</DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {!match ? (
            <p className="py-10 text-center text-sm text-cp-muted">Select a match to view history.</p>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-cp-border/80 bg-cp-elevated/15 px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                      {match.teamAName ?? "Team A"}
                    </p>
                    <TeamPlayerList names={match.teamAPlayers} maxNames={4} className="mt-1 justify-center sm:justify-start" />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold tabular-nums text-foreground">
                      {match.scoreA ?? 0}
                      <span className="mx-2 text-cp-muted">-</span>
                      {match.scoreB ?? 0}
                    </p>
                    {match.durationSeconds != null ? (
                      <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-cp-muted">
                        <Clock className="h-3.5 w-3.5" />
                        {formatStatDuration(match.durationSeconds)}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0 text-center sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                      {match.teamBName ?? "Team B"}
                    </p>
                    <TeamPlayerList
                      names={match.teamBPlayers}
                      maxNames={4}
                      align="right"
                      className="mt-1 justify-center sm:justify-end"
                    />
                  </div>
                </div>
              </div>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ListOrdered className="h-4 w-4 text-cp-primary" />
                  Point-by-point log
                </h3>
                {auditLoading && pointRows.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <LoadingSpinner label="Loading score history…" />
                  </div>
                ) : pointRows.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-dashed border-cp-border px-4 py-8 text-center text-sm text-cp-muted">
                    No detailed point log for this match. Final score is shown above.
                  </p>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-xl border border-cp-border">
                    <OfficialPointLogTimeline
                      events={mergedEvents}
                      matchContext={buildContext(match)}
                      includeAudit
                      className="max-h-[min(24rem,40vh)] overflow-y-auto"
                    />
                  </div>
                )}
              </section>

              {serviceEvents.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold text-foreground">Service history</h3>
                  <ul className="mt-2 divide-y divide-cp-border/60 rounded-xl border border-cp-border/80 bg-cp-elevated/10">
                    {serviceEvents.slice(0, 40).map((row, idx) => (
                      <li
                        key={`${row.event.at}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                      >
                        <span className="text-cp-muted">
                          {describeScoreEvent(row.event, buildContext(match), row.previous)}
                        </span>
                        {row.event.scorerName ? (
                          <span className="font-medium text-foreground">
                            Scorer: {row.event.scorerName}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
