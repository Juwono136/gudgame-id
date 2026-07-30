"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, Radio, Swords, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publicSportRoutes } from "@/lib/constants/routes";
import { tournamentEditUrl } from "@/lib/tournaments/edit-routes";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import {
  cpAlertWarningBodyTextClass,
  cpAlertWarningIconClass,
  cpAlertWarningOutlineButtonClass,
  cpAlertWarningStepBadgeClass,
  cpAlertWarningStrongTextClass,
  cpAlertWarningSubtextClass,
  cpAlertWarningSurfaceClass,
  cpFunAccentSurfaceClass,
  cpFunAccentTextClass,
  cpOfficialAccentSurfaceClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type BracketPlayReadinessCardProps = {
  sportSlug: string;
  slug: string;
  tournamentId: string;
  tournamentStatus: string;
  matches: BracketMatchView[];
  matchScoringHint: string;
  courtCount: number;
  seedingFinalized: boolean;
  accentVariant?: "official" | "fun";
  onOpenLiveScoring?: () => void;
  /** Prefer partner manage URL when provided. */
  manageScoringHref?: string;
};

export function BracketPlayReadinessCard({
  sportSlug,
  slug,
  tournamentId,
  tournamentStatus,
  matches,
  matchScoringHint,
  courtCount,
  seedingFinalized,
  accentVariant = "official",
  onOpenLiveScoring,
  manageScoringHref,
}: BracketPlayReadinessCardProps) {
  const liveScoringUrl =
    manageScoringHref ??
    `${publicSportRoutes.tournamentManage(sportSlug, slug)}?section=scoring`;
  const editUrl = tournamentEditUrl(tournamentId, "host");
  const isOfficial = accentVariant === "official";

  const live = matches.filter((m) => m.status === "in_progress");
  const ready = matches.filter(
    (m) => m.status === "pending" && m.teamAName && m.teamBName,
  );
  const completed = matches.filter((m) => m.status === "completed");
  const isLive = tournamentStatus === "live";
  const isCompleted = tournamentStatus === "completed";

  const liveScoringButton = (
    label: string,
    options?: { size?: "sm" | "default"; className?: string; showRadio?: boolean; showArrow?: boolean },
  ) => {
    const { size = "default", className, showRadio = false, showArrow = false } = options ?? {};
    const content = (
      <>
        {showRadio ? <Radio className="mr-1.5 h-3.5 w-3.5" /> : null}
        {label}
        {showArrow ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
      </>
    );

    if (onOpenLiveScoring) {
      return (
        <Button type="button" size={size} className={className} onClick={onOpenLiveScoring}>
          {content}
        </Button>
      );
    }

    return (
      <Button asChild size={size} className={className}>
        <Link href={liveScoringUrl}>{content}</Link>
      </Button>
    );
  };

  return (
    <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Swords
              className={cn("h-4 w-4", isOfficial ? "text-cp-primary" : cpFunAccentTextClass)}
            />
            {isLive ? "Live play" : isCompleted ? "Bracket results" : "Next: live play"}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-cp-muted">
            {isLive
              ? "Start matches and update scores from the Live scoring tab using your configured courts."
              : isCompleted
                ? "This tournament has ended. Final bracket results are shown in the tree above."
                : "Seeding is complete. Set the tournament to Live, then open Live scoring to start matches on court."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="muted">{live.length} live</Badge>
          <Badge variant="muted">{ready.length} ready</Badge>
          <Badge variant="muted">{completed.length} completed</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-cp-muted">
        <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5">
          {matchScoringHint}
        </span>
        <span className="rounded-full border border-cp-border bg-cp-elevated/40 px-2.5 py-0.5">
          {courtCount} court{courtCount === 1 ? "" : "s"}
        </span>
      </div>

      {!isLive && !isCompleted ? (
        <div className={cn("mt-5 p-4 sm:p-5", cpAlertWarningSurfaceClass)}>
          <div className="flex items-start gap-3">
            <Lock className={cn("mt-0.5 h-5 w-5 shrink-0", cpAlertWarningIconClass)} />
            <div className="min-w-0 flex-1 space-y-3">
              <p className={cn("text-sm font-medium", cpAlertWarningBodyTextClass)}>
                Scoring is locked while the tournament is upcoming
              </p>
              <ol className={cn("space-y-2 text-sm", cpAlertWarningSubtextClass)}>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn(
                      "h-4 w-4 shrink-0",
                      seedingFinalized ? cpFunAccentTextClass : "opacity-40",
                    )}
                  />
                  Bracket generated & seeding saved
                </li>
                <li className="flex items-center gap-2">
                  <span className={cpAlertWarningStepBadgeClass}>2</span>
                  Set tournament status to{" "}
                  <strong className={cpAlertWarningStrongTextClass}>Live</strong> in tournament
                  settings
                </li>
                <li className="flex items-center gap-2">
                  <span className={cpAlertWarningStepBadgeClass}>3</span>
                  Open <strong className={cpAlertWarningStrongTextClass}>Live scoring</strong> to
                  assign courts and score matches
                </li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className={cpAlertWarningOutlineButtonClass}
                >
                  <Link href={editUrl}>Edit tournament status</Link>
                </Button>
                {liveScoringButton("Preview Live scoring", {
                  size: "sm",
                  showRadio: true,
                  className: cn(
                    isOfficial
                      ? "bg-cp-primary hover:bg-cp-primary-light"
                      : "bg-emerald-600 hover:bg-emerald-500",
                  ),
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isLive ? (
        <div
          className={cn(
            "mt-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
            isOfficial ? cpOfficialAccentSurfaceClass : cpFunAccentSurfaceClass,
          )}
        >
          <p className="text-sm text-foreground">
            Multi-court bracket scoring is ready — assign each ready match to a court and finalize
            results there.
          </p>
          {liveScoringButton("Open Live scoring", {
            showArrow: true,
            className: cn(
              "shrink-0",
              isOfficial
                ? "bg-cp-primary hover:bg-cp-primary-light"
                : "bg-emerald-600 hover:bg-emerald-500",
            ),
          })}
        </div>
      ) : null}

      {ready.length > 0 && !isCompleted ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
              Match queue
            </p>
            <p className="text-[11px] text-cp-muted">
              {ready.length} ready match{ready.length === 1 ? "" : "es"}
            </p>
          </div>
          <ul className="mt-2 max-h-[min(28rem,50vh)] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {ready.map((m) => {
              const playersA = m.teamAPlayers?.filter(Boolean) ?? [];
              const playersB = m.teamBPlayers?.filter(Boolean) ?? [];
              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-cp-border/80 bg-cp-elevated/25 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        R{m.roundNumber} M{m.matchNumber}: {m.teamAName} vs {m.teamBName}
                      </p>
                      {(playersA.length > 0 || playersB.length > 0) ? (
                        <p className="mt-1 text-[11px] leading-snug text-cp-muted">
                          {playersA.length ? playersA.join(" · ") : "TBD"}
                          <span className="mx-1.5 text-cp-muted/50">vs</span>
                          {playersB.length ? playersB.join(" · ") : "TBD"}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="muted" className="shrink-0">
                      Ready
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {completed.length > 0 ? (
        <div className="mt-6 border-t border-cp-border pt-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cp-muted">
            <Trophy className="h-3.5 w-3.5" />
            Recent results
          </p>
          <ul className="mt-3 space-y-2">
            {completed.slice(-4).reverse().map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-1 rounded-lg border border-cp-border/70 bg-cp-elevated/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-foreground">
                  R{m.roundNumber} · {m.teamAName} vs {m.teamBName}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-semibold",
                    isOfficial ? "text-cp-primary" : cpFunAccentTextClass,
                  )}
                >
                  {m.scoreA ?? 0} – {m.scoreB ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
