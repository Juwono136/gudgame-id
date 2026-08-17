"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PlayerMatchTypeBadge } from "@/components/dashboard/player/competition/player-match-type-badge";
import { usePlayerMatchDetail } from "@/hooks/use-player-competition";
import { formatMatchDate } from "@/lib/account/player-competition/format-match";
import { publicSportRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type PlayerMatchDetailDialogProps = {
  matchId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatDuration(seconds: number | null) {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function PlayerMatchDetailDialog({
  matchId,
  open,
  onOpenChange,
}: PlayerMatchDetailDialogProps) {
  const { data, isLoading, error, isFetching } = usePlayerMatchDetail(matchId, open);

  const tournamentHref =
    data?.sportSlug && data.tournamentSlug
      ? publicSportRoutes.tournament(data.sportSlug, data.tournamentSlug)
      : null;

  const outcomeLabel = data?.resultType === "win" ? "Victory" : "Defeat";
  const scoreDisplay = data?.score ?? outcomeLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,52rem)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden border-cp-border bg-cp-card p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-2 border-b border-cp-border px-4 py-4 text-left sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {data ? <PlayerMatchTypeBadge tournamentType={data.tournamentType} /> : null}
            {data?.round ? (
              <span className="rounded-full bg-cp-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                {data.round}
              </span>
            ) : null}
          </div>
          <DialogTitle className="flex items-start gap-2 pr-6 text-lg leading-snug sm:text-xl">
            <Swords className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
            <span>{data?.tournamentName ?? "Match details"}</span>
          </DialogTitle>
          <DialogDescription>
            Full record of this match from your personal competition history.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner label="Loading match details…" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-8 text-center">
              <p className="text-sm font-medium text-red-300">Could not load match</p>
              <p className="mt-1 text-xs text-red-300/80">
                {error instanceof Error ? error.message : "Something went wrong"}
              </p>
            </div>
          ) : data ? (
            <div className="space-y-5">
              <div
                className={cn(
                  "rounded-2xl border px-4 py-5 text-center sm:px-6",
                  data.resultType === "win"
                    ? "border-cp-primary/30 bg-cp-primary/10"
                    : "border-red-500/25 bg-red-500/10",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                  Your result
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-bold tabular-nums",
                    data.resultType === "win" ? "text-cp-primary" : "text-red-400",
                  )}
                >
                  {scoreDisplay}
                </p>
                <p className="mt-1 text-sm text-cp-muted">{outcomeLabel}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{data.opponents}</p>
              </div>

              <section className="rounded-2xl border border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Trophy className="h-4 w-4 text-cp-primary" />
                  Tournament
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailRow label="Event" value={data.tournamentName} />
                  <DetailRow label="Sport" value={data.sportName ?? "—"} />
                  <DetailRow
                    label="Venue"
                    value={
                      data.venue ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-cp-muted" />
                          {data.venue}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    label="Your squad"
                    value={
                      data.userTeamName ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 shrink-0 text-cp-muted" />
                          {data.userTeamName}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    label="Event status"
                    value={
                      data.tournamentStatus ? (
                        <span className="capitalize">{data.tournamentStatus.replace(/_/g, " ")}</span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    label="Event dates"
                    value={
                      data.tournamentStartsAt
                        ? `${formatMatchDate(data.tournamentStartsAt, "short")}${
                            data.tournamentEndsAt
                              ? ` – ${formatMatchDate(data.tournamentEndsAt, "short")}`
                              : ""
                          }`
                        : "—"
                    }
                  />
                </dl>
                {tournamentHref ? (
                  <Button asChild variant="outline" size="sm" className="mt-4 h-9 border-cp-border">
                    <Link href={tournamentHref}>
                      View tournament page
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : null}
              </section>

              <section className="rounded-2xl border border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-cp-primary" />
                  Match timeline
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailRow label="Played on" value={formatMatchDate(data.playedAt, "long")} />
                  <DetailRow
                    label="Time"
                    value={formatMatchDate(data.playedAt, "datetime").split(", ").slice(1).join(", ") || "—"}
                  />
                  <DetailRow label="Round / stage" value={data.round ?? "—"} />
                  <DetailRow label="Logged on" value={formatMatchDate(data.recordedAt, "datetime")} />
                </dl>
              </section>

              {data.source ? (
                <section className="rounded-2xl border border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-cp-primary" />
                    Match breakdown
                  </h3>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DetailRow
                      label="Format"
                      value={
                        data.source.kind === "bracket"
                          ? "Knockout bracket"
                          : data.source.kind === "group"
                            ? "Group / round robin"
                            : "Fun Match round"
                      }
                    />
                    <DetailRow
                      label="Status"
                      value={
                        <span className="capitalize">
                          {data.source.status?.replace(/_/g, " ") ?? "—"}
                        </span>
                      }
                    />
                    {data.source.scoreA != null && data.source.scoreB != null ? (
                      <DetailRow
                        label="Final score"
                        value={`${data.source.teamAName ?? "Team A"} ${data.source.scoreA} – ${data.source.scoreB} ${data.source.teamBName ?? "Team B"}`}
                        className="sm:col-span-2"
                      />
                    ) : null}
                    {formatDuration(data.source.durationSeconds) ? (
                      <DetailRow label="Duration" value={formatDuration(data.source.durationSeconds)} />
                    ) : null}
                    {data.source.summary ? (
                      <DetailRow label="Summary" value={data.source.summary} className="sm:col-span-2" />
                    ) : null}
                  </dl>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end border-t border-cp-border px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-9 border-cp-border"
            onClick={() => onOpenChange(false)}
            disabled={isFetching && !data}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
