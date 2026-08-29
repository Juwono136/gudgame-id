"use client";

import { useMemo } from "react";
import { BarChart3, Share2, Trophy, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatStatDuration } from "@/lib/tournaments/stats/compute";
import type { TournamentPlayerStatRow } from "@/lib/tournaments/stats/types";
import { cn } from "@/lib/utils";

export type PlayerSessionMatchRow = {
  id: string;
  roundLabel: string;
  courtLabel?: string | null;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers: string[];
  teamBPlayers: string[];
  scoreA: number | null;
  scoreB: number | null;
  durationSeconds: number | null;
  /** Player's team name for this fixture. */
  playerTeamName: string;
};

type TournamentPlayerSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: TournamentPlayerStatRow | null;
  matches?: PlayerSessionMatchRow[];
  isLoading?: boolean;
  accentClassName?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function pct(n: number, d: number) {
  if (d <= 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export function TournamentPlayerSessionDialog({
  open,
  onOpenChange,
  player,
  matches = [],
  isLoading = false,
  accentClassName = "text-cp-primary",
}: TournamentPlayerSessionDialogProps) {
  const stats = useMemo(() => {
    if (!player) return null;
    const played = player.teamPlayed;
    const wins = player.teamWins;
    const losses = player.teamLosses;
    const ties = Math.max(0, played - wins - losses);
    const scored = player.teamPointsFor;
    const conceded = player.teamPointsAgainst;
    return {
      played,
      winRate: pct(wins, played),
      pointDiff: scored - conceded,
      wins,
      losses,
      ties,
      virtual: 0,
      scored,
      conceded,
      avgScored: played > 0 ? (scored / played).toFixed(1) : "0",
      avgConceded: played > 0 ? (conceded / played).toFixed(1) : "0",
    };
  }, [player]);

  const playerMatches = useMemo(() => {
    if (!player) return [];
    return matches.filter((m) => {
      const onA =
        m.teamAName === player.teamName || m.teamAPlayers.includes(player.displayName);
      const onB =
        m.teamBName === player.teamName || m.teamBPlayers.includes(player.displayName);
      return onA || onB;
    });
  }, [matches, player]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,52rem)] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-cp-border bg-cp-card p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-0 border-b border-cp-border px-4 py-4 text-left sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-11 w-11 border border-cp-border">
                <AvatarImage src={player?.image ?? undefined} alt="" />
                <AvatarFallback className="bg-cp-elevated text-sm">
                  {player ? initials(player.displayName) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-semibold">
                  {player?.displayName ?? "Player"}
                </DialogTitle>
                <DialogDescription className="truncate">
                  {player?.teamName ?? "Team"} · session stats
                </DialogDescription>
              </div>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {isLoading && !player ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner label="Loading player stats…" />
            </div>
          ) : !player || !stats ? (
            <p className="py-10 text-center text-sm text-cp-muted">Select a player to view stats.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Played", value: String(stats.played) },
                  { label: "Win rate", value: stats.winRate },
                  { label: "Point diff", value: String(stats.pointDiff) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-cp-border/80 bg-cp-elevated/25 px-2 py-2.5 text-center"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                      {item.label}
                    </p>
                    <p className={cn("mt-0.5 text-lg font-bold tabular-nums", accentClassName)}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <section>
                <h3 className="text-sm font-semibold text-foreground">Match status</h3>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { label: "Won", value: stats.wins, className: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Lost", value: stats.losses, className: "text-red-600 dark:text-red-400" },
                    { label: "Ties", value: stats.ties, className: "text-foreground" },
                    { label: "Virtual", value: stats.virtual, className: "text-amber-600 dark:text-amber-400" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-cp-border/70 bg-cp-elevated/15 px-2 py-2 text-center"
                    >
                      <p className="text-[10px] text-cp-muted">{item.label}</p>
                      <p className={cn("text-base font-bold tabular-nums", item.className)}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <BarChart3 className={cn("h-4 w-4", accentClassName)} />
                  Score statistics
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { label: "Total scored", value: stats.scored, tone: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Total conceded", value: stats.conceded, tone: "text-red-600 dark:text-red-400" },
                    { label: "Avg scored / match", value: stats.avgScored, tone: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Avg conceded / match", value: stats.avgConceded, tone: "text-red-600 dark:text-red-400" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-cp-border/70 bg-cp-elevated/15 px-3 py-2.5"
                    >
                      <p className="text-[10px] text-cp-muted">{item.label}</p>
                      <p className={cn("text-lg font-bold tabular-nums", item.tone)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Trophy className={cn("h-4 w-4", accentClassName)} />
                  Games history ({playerMatches.length})
                </h3>
                {playerMatches.length === 0 ? (
                  <p className="mt-2 text-sm text-cp-muted">No finished matches yet for this player.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {playerMatches.map((m) => {
                      const onTeamA =
                        m.teamAName === player.teamName ||
                        m.teamAPlayers.includes(player.displayName);
                      const playerScore = onTeamA ? m.scoreA : m.scoreB;
                      const oppScore = onTeamA ? m.scoreB : m.scoreA;
                      const won =
                        playerScore != null && oppScore != null ? playerScore > oppScore : false;
                      const opponents = onTeamA ? m.teamBPlayers : m.teamAPlayers;
                      return (
                        <li
                          key={m.id}
                          className="rounded-xl border border-cp-border/80 bg-cp-elevated/10 p-3 transition-colors hover:bg-cp-elevated/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-cp-muted">
                                {m.roundLabel}
                                {m.courtLabel ? ` · ${m.courtLabel}` : ""}
                              </p>
                              <p className="mt-1 text-xs text-cp-muted">
                                vs {opponents.join(" · ") || (onTeamA ? m.teamBName : m.teamAName) || "Opponent"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={cn(
                                  "text-xl font-bold tabular-nums",
                                  won
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-foreground",
                                )}
                              >
                                {playerScore ?? 0}
                                <span className="mx-1 text-cp-muted">-</span>
                                {oppScore ?? 0}
                              </p>
                              <p className="text-[10px] text-cp-muted">Finished</p>
                            </div>
                          </div>
                          {m.durationSeconds != null ? (
                            <p className="mt-1.5 text-[10px] tabular-nums text-cp-muted">
                              {formatStatDuration(m.durationSeconds)}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-cp-border px-4 py-3 sm:px-5">
          <Button type="button" variant="outline" size="sm" className="gap-1.5 border-cp-border" disabled>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
