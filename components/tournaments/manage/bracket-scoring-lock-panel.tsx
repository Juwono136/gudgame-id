"use client";

import Link from "next/link";
import { CheckCircle2, GitBranch, Lock, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publicSportRoutes } from "@/lib/constants/routes";
import { tournamentEditUrl } from "@/lib/tournaments/edit-routes";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { cn } from "@/lib/utils";

type BracketScoringLockPanelProps = {
  sportSlug: string;
  slug: string;
  tournamentId: string;
  tournamentStatus: string;
  bracketMatches: BracketMatchView[];
  courtCount: number;
  pointsPerMatch: number;
  hasBracket: boolean;
};

function formatReadyMatch(m: BracketMatchView): string {
  return `R${m.roundNumber} M${m.matchNumber}: ${m.teamAName} vs ${m.teamBName}`;
}

export function BracketScoringLockPanel({
  sportSlug,
  slug,
  tournamentId,
  tournamentStatus,
  bracketMatches,
  courtCount,
  pointsPerMatch,
  hasBracket,
}: BracketScoringLockPanelProps) {
  const bracketUrl = `${publicSportRoutes.tournamentManage(sportSlug, slug)}?section=bracket`;
  const editUrl = tournamentEditUrl(tournamentId, "host");

  const readyMatches = bracketMatches.filter(
    (m) => m.status === "pending" && m.teamAName && m.teamBName,
  );
  const isUpcoming = tournamentStatus === "upcoming" || tournamentStatus === "draft";

  if (!hasBracket) {
    return (
      <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/50 p-8 text-center sm:p-10">
        <GitBranch className="mx-auto h-10 w-10 text-cp-muted/60" />
        <h3 className="mt-3 text-lg font-semibold text-foreground">Bracket not ready</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-cp-muted">
          Generate and save the elimination bracket first, then return here to score matches on
          court.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href={bracketUrl}>Open Bracket setup</Link>
        </Button>
      </div>
    );
  }

  if (tournamentStatus === "completed" || tournamentStatus === "cancelled") {
    return (
      <div className="rounded-2xl border border-cp-border bg-cp-card/60 p-6 text-center text-sm text-cp-muted">
        This tournament is no longer accepting live scores.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/20 to-cp-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-950/40">
            <Lock className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {isUpcoming ? "Live scoring opens when the tournament is Live" : "Scoring unavailable"}
            </h3>
            <p className="mt-1 max-w-xl text-sm text-cp-muted">
              {isUpcoming
                ? `Your bracket is configured for ${courtCount} court${courtCount === 1 ? "" : "s"} at ${pointsPerMatch} points per match. Publish the tournament as Live to unlock court controls below.`
                : "Set the tournament to Live before starting bracket matches on court."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="border-amber-500/30">
            <Link href={editUrl}>Set status to Live</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={bracketUrl}>Review bracket</Link>
          </Button>
        </div>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-3">
        {[
          { done: hasBracket, label: "Bracket saved" },
          { done: !isUpcoming && tournamentStatus === "live", label: "Tournament Live" },
          { done: false, label: "Score on courts" },
        ].map((step) => (
          <li
            key={step.label}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              step.done
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                : "border-cp-border/80 bg-cp-elevated/20 text-cp-muted",
            )}
          >
            <CheckCircle2
              className={cn("h-4 w-4 shrink-0", step.done ? "text-emerald-400" : "opacity-35")}
            />
            {step.label}
          </li>
        ))}
      </ol>

      {readyMatches.length > 0 ? (
        <div className="mt-5 rounded-xl border border-cp-border/80 bg-cp-elevated/20 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cp-muted">
            <Radio className="h-3.5 w-3.5" />
            Waiting to start ({readyMatches.length})
          </p>
          <ul className="mt-3 space-y-2">
            {readyMatches.slice(0, 4).map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium text-foreground">{formatReadyMatch(m)}</span>
                <Badge variant="muted">Queued</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
