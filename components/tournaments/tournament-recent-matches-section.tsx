"use client";

import { ArrowRight, Clock, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecentMatchRow } from "@/lib/tournaments/recent-matches";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type TournamentRecentMatchesSectionProps = {
  variant: "reclub" | "official";
  rows: RecentMatchRow[];
  onViewAll?: () => void;
  /** Official: show section even when empty (bracket pending / no results yet). */
  alwaysShow?: boolean;
  emptyMessage?: string;
  /** Label for the empty-state CTA when onViewAll is set. */
  emptyActionLabel?: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function statusBadgeVariant(status: string): "success" | "warning" | "muted" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "muted";
}

function ScoreCell({ row }: { row: RecentMatchRow }) {
  const hasScore = row.scoreA != null || row.scoreB != null;
  return (
    <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-foreground">
      <span className={cn(row.winnerName === row.teamAName && "text-emerald-300")}>
        {row.scoreA ?? "–"}
      </span>
      <span className="font-normal text-cp-muted">:</span>
      <span className={cn(row.winnerName === row.teamBName && "text-emerald-300")}>
        {row.scoreB ?? "–"}
      </span>
      {!hasScore ? <span className="sr-only">No score</span> : null}
    </span>
  );
}

function MatchTeams({ row }: { row: RecentMatchRow }) {
  return (
    <div className="min-w-0">
      <p className="font-medium leading-snug text-foreground">
        <span className="break-words">{row.teamAName}</span>
        <span className="mx-1.5 shrink-0 font-normal text-cp-muted">vs</span>
        <span className="break-words">{row.teamBName}</span>
      </p>
      {row.matchNumber != null ? (
        <p className="mt-0.5 text-xs text-cp-muted">Match {row.matchNumber}</p>
      ) : null}
    </div>
  );
}

export function TournamentRecentMatchesSection({
  variant,
  rows,
  onViewAll,
  alwaysShow = false,
  emptyMessage,
  emptyActionLabel,
}: TournamentRecentMatchesSectionProps) {
  const isOfficial = variant === "official";
  const title = isOfficial ? "Recent matches" : "Recent rounds";
  const accent = isOfficial ? "text-cp-primary" : "text-emerald-400";
  const roundAccent = isOfficial ? "text-cp-primary" : "text-emerald-300";

  if (rows.length === 0 && !alwaysShow) return null;

  const defaultEmptyMessage = isOfficial
    ? "Match results will appear here once the bracket is published and play begins."
    : "Rounds will appear here after the host starts play in the lobby.";

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cp-border bg-cp-elevated/30 px-4 py-4 sm:px-6">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
            <Swords className={cn("h-5 w-5 shrink-0", accent)} />
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-cp-muted">
            {isOfficial
              ? "Latest results — tap Full history for the complete match log."
              : "Latest lobby and bracket rounds from this session."}
          </p>
        </div>
        {onViewAll && rows.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("shrink-0", isOfficial ? "text-cp-primary" : "text-emerald-400")}
            onClick={onViewAll}
          >
            Full history
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <Swords className={cn("h-9 w-9", accent, "opacity-60")} />
          <p className="text-sm font-medium text-foreground">No matches yet</p>
          <p className="max-w-md text-xs text-cp-muted">
            {emptyMessage ?? defaultEmptyMessage}
          </p>
          {onViewAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 border-cp-border"
              onClick={onViewAll}
            >
              {emptyActionLabel ?? (isOfficial ? "View history" : "Open bracket")}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : (
        <>
      <div className="divide-y divide-cp-border md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="space-y-2.5 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "inline-flex rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                  isOfficial ? statusBadgeClass.accent : statusBadgeClass.reclub,
                )}
              >
                {row.roundLabel}
              </span>
              <Badge variant={statusBadgeVariant(row.status)} className="capitalize">
                {row.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <MatchTeams row={row} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ScoreCell row={row} />
              <div className="flex flex-wrap items-center gap-3 text-xs text-cp-muted">
                {row.playedAt ? <span>{formatWhen(row.playedAt)}</span> : null}
                {!isOfficial && row.durationSeconds != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(row.durationSeconds)}
                  </span>
                ) : null}
              </div>
            </div>
            {row.playersSummary ? (
              <p className="line-clamp-2 text-xs text-cp-muted">{row.playersSummary}</p>
            ) : null}
            {isOfficial && row.winnerName ? (
              <p className="text-xs text-cp-muted">
                Winner: <span className="font-medium text-foreground">{row.winnerName}</span>
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-cp-border bg-cp-elevated/40 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              <th className="min-w-[5.5rem] max-w-[8rem] px-4 py-3 sm:px-6">Round</th>
              <th className="min-w-[10rem] px-4 py-3">Match</th>
              {!isOfficial ? <th className="min-w-[9rem] px-4 py-3">Players</th> : null}
              {isOfficial ? <th className="min-w-[6rem] px-4 py-3">Winner</th> : null}
              <th className="w-20 px-4 py-3 text-center">Score</th>
              {!isOfficial ? <th className="w-20 px-4 py-3">Duration</th> : null}
              {isOfficial ? <th className="min-w-[6rem] px-4 py-3">Played</th> : null}
              <th className="min-w-[5.5rem] px-4 py-3 text-right sm:px-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cp-border/70">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-cp-elevated/25">
                <td className="px-4 py-3.5 align-top sm:px-6">
                  <span
                    className={cn(
                      "block break-words text-xs font-bold uppercase leading-snug tracking-wide",
                      roundAccent,
                    )}
                  >
                    {row.roundLabel}
                  </span>
                  {row.matchNumber != null ? (
                    <p className="mt-0.5 text-[10px] text-cp-muted">M{row.matchNumber}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3.5 align-top">
                  <MatchTeams row={row} />
                  {row.playedAt && !isOfficial ? (
                    <p className="mt-1 text-xs text-cp-muted">{formatWhen(row.playedAt)}</p>
                  ) : null}
                </td>
                {!isOfficial ? (
                  <td className="px-4 py-3.5 align-top text-xs leading-relaxed text-cp-muted">
                    {row.playersSummary ?? "—"}
                  </td>
                ) : null}
                {isOfficial ? (
                  <td className="px-4 py-3.5 text-sm text-foreground">
                    {row.winnerName ?? "—"}
                  </td>
                ) : null}
                <td className="px-4 py-3.5 text-center">
                  <ScoreCell row={row} />
                </td>
                {!isOfficial ? (
                  <td className="px-4 py-3.5 text-xs text-cp-muted">
                    {formatDuration(row.durationSeconds)}
                  </td>
                ) : null}
                {isOfficial ? (
                  <td className="px-4 py-3.5 text-xs text-cp-muted">
                    {row.playedAt ? formatWhen(row.playedAt) : "—"}
                  </td>
                ) : null}
                <td className="px-4 py-3.5 text-right sm:px-6">
                  <Badge variant={statusBadgeVariant(row.status)} className="capitalize">
                    {row.status.replace(/_/g, " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </section>
  );
}
