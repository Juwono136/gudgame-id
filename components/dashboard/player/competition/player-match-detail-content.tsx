"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ExternalLink,
  MapPin,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PlayerMatchTypeBadge } from "@/components/dashboard/player/competition/player-match-type-badge";
import { usePlayerMatchDetail } from "@/hooks/use-player-competition";
import { formatMatchDate } from "@/lib/account/player-competition/format-match";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

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

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "primary" | "emerald" | "red" | "muted";
}) {
  return (
    <div className="rounded-xl border border-cp-border bg-cp-elevated/40 px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums sm:text-2xl",
          accent === "primary" && "text-cp-primary",
          accent === "emerald" && "text-emerald-400",
          accent === "red" && "text-red-400",
          (!accent || accent === "muted") && "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[10px] text-cp-muted sm:text-xs">{sub}</p> : null}
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

function formatStatsTier(tier: string | null) {
  if (!tier) return "—";
  return tier.replace(/_/g, " ");
}

function formatTimeOnly(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

type PlayerMatchDetailContentProps = {
  matchId: number;
  backHref?: string;
  backLabel?: string;
};

export function PlayerMatchDetailContent({
  matchId,
  backHref = `${dashboardRoutes.tournaments}?scope=history`,
  backLabel = "Back to match history",
}: PlayerMatchDetailContentProps) {
  const { data, isLoading, error } = usePlayerMatchDetail(matchId, true);

  const tournamentHref =
    data?.sportSlug && data.tournamentSlug
      ? publicSportRoutes.tournament(data.sportSlug, data.tournamentSlug)
      : null;

  const isWin = data?.resultType === "win";
  const outcomeLabel = isWin ? "Victory" : "Defeat";

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm font-medium text-cp-primary hover:underline"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {backLabel}
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-20">
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
        <>
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <PlayerMatchTypeBadge tournamentType={data.tournamentType} />
              {data.round ? (
                <span className="rounded-full bg-cp-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                  {data.round}
                </span>
              ) : null}
              {data.statsTier ? (
                <span className="rounded-full border border-cp-border bg-cp-elevated/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                  {formatStatsTier(data.statsTier)}
                </span>
              ) : null}
            </div>
            <h1 className="flex items-start gap-2 text-xl font-bold text-foreground sm:text-3xl">
              <Swords className="mt-0.5 h-6 w-6 shrink-0 text-cp-primary" />
              {data.tournamentName}
            </h1>
            <p className="text-sm text-cp-muted">
              Full match record with tournament context and your career statistics.
            </p>
          </header>

          <div
            className={cn(
              "overflow-hidden rounded-2xl border",
              isWin ? "border-cp-primary/30 bg-cp-primary/10" : "border-red-500/25 bg-red-500/10",
            )}
          >
            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                  Your result
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-bold tabular-nums sm:text-5xl",
                    isWin ? "text-cp-primary" : "text-red-400",
                  )}
                >
                  {data.score ?? outcomeLabel}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{outcomeLabel}</p>
                <p className="mt-2 text-sm text-cp-muted">{data.opponents}</p>
                {data.userTeamName ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-cp-muted">
                    <Users className="h-3.5 w-3.5" />
                    Playing as {data.userTeamName}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[12rem]">
                <StatTile
                  label="Points"
                  value={`+${data.tournamentContext.pointsEarned}`}
                  accent="primary"
                />
                <StatTile
                  label="Event record"
                  value={`${data.tournamentContext.userWins}–${data.tournamentContext.userLosses}`}
                  sub={
                    data.tournamentContext.userWinRate != null
                      ? `${data.tournamentContext.userWinRate}% in event`
                      : undefined
                  }
                />
              </div>
            </div>
          </div>

          {data.careerSnapshot.totalMatches > 0 ? (
            <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-cp-primary" />
                Your career snapshot
                {data.sportName ? (
                  <span className="font-normal text-cp-muted">· {data.sportName}</span>
                ) : null}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <StatTile
                  label="Tier"
                  value={data.careerSnapshot.tier ?? "—"}
                  accent="primary"
                />
                <StatTile
                  label="Total points"
                  value={data.careerSnapshot.totalPoints.toLocaleString()}
                />
                <StatTile
                  label="Win rate"
                  value={
                    data.careerSnapshot.winRate != null
                      ? `${data.careerSnapshot.winRate}%`
                      : "—"
                  }
                  accent="emerald"
                />
                <StatTile
                  label="Rank"
                  value={
                    data.careerSnapshot.worldRank != null
                      ? `#${data.careerSnapshot.worldRank}`
                      : "—"
                  }
                />
              </div>
              <p className="mt-3 text-xs text-cp-muted">
                Based on {data.careerSnapshot.totalMatches} recorded matches ({data.careerSnapshot.wins}W · {data.careerSnapshot.losses}L). Official events earn more ranking points than Fun Match sessions.
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Trophy className="h-4 w-4 text-cp-primary" />
              Tournament context
            </h2>
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
                value={data.userTeamName ?? "—"}
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
              <DetailRow
                label="Your matches in event"
                value={`${data.tournamentContext.userMatches} played`}
              />
              <DetailRow
                label="Event placement"
                value={data.tournamentContext.placement ?? "—"}
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

          {data.source ? (
            <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Target className="h-4 w-4 text-cp-primary" />
                Match statistics
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailRow
                  label="Format"
                  value={data.source.kind === "bracket" ? "Knockout bracket" : "Fun Match round"}
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
                  <>
                    <DetailRow
                      label={data.source.teamAName ?? "Team A"}
                      value={data.source.scoreA}
                      className="text-center sm:text-left"
                    />
                    <DetailRow
                      label={data.source.teamBName ?? "Team B"}
                      value={data.source.scoreB}
                      className="text-center sm:text-left"
                    />
                  </>
                ) : null}
                {formatDuration(data.source.durationSeconds) ? (
                  <DetailRow label="Duration" value={formatDuration(data.source.durationSeconds)} />
                ) : null}
                {data.source.roundNumber != null ? (
                  <DetailRow label="Round number" value={data.source.roundNumber} />
                ) : null}
                {data.source.matchNumber != null ? (
                  <DetailRow label="Match number" value={data.source.matchNumber} />
                ) : null}
              </dl>
              {data.source.summary ? (
                <div className="mt-4 rounded-xl border border-cp-border/60 bg-cp-elevated/30 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                    Match notes
                  </p>
                  <p className="mt-1 text-sm text-foreground">{data.source.summary}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-cp-primary" />
              Timeline
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailRow label="Played on" value={formatMatchDate(data.playedAt, "long")} />
              <DetailRow label="Kick-off time" value={formatTimeOnly(data.playedAt)} />
              <DetailRow label="Round / stage" value={data.round ?? "—"} />
              <DetailRow label="Logged on" value={formatMatchDate(data.recordedAt, "datetime")} />
            </dl>
          </section>
        </>
      ) : null}
    </div>
  );
}
