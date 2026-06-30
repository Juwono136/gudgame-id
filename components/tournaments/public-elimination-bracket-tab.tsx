"use client";

import Link from "next/link";
import { ArrowRight, Radio, Trophy } from "lucide-react";
import { OfficialBracketView } from "@/components/tournaments/official-bracket-view";
import { Button } from "@/components/ui/button";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { cn } from "@/lib/utils";

type PublicEliminationBracketTabProps = {
  sportSlug: string;
  slug: string;
  matches: BracketMatchView[];
  participant: TournamentParticipantContext;
  variant?: "official" | "reclub";
  tournamentStatus?: string;
  /** When the tree is already rendered above (fun match panel), set false. */
  showBracketTree?: boolean;
};

export function PublicEliminationBracketTab({
  sportSlug,
  slug,
  matches,
  participant,
  variant = "official",
  tournamentStatus = "upcoming",
  showBracketTree = true,
}: PublicEliminationBracketTabProps) {
  const manageScoringUrl = `${publicSportRoutes.tournamentManage(sportSlug, slug)}?section=scoring`;
  const manageBracketUrl = `${publicSportRoutes.tournamentManage(sportSlug, slug)}?section=bracket`;
  const isOfficial = variant === "official";
  const accentClass = isOfficial ? "text-cp-primary" : "text-emerald-400";
  const borderAccent = isOfficial ? "border-cp-primary/25" : "border-emerald-500/25";
  const liveMatches = matches.filter((m) => m.status === "in_progress");
  const canManage = participant.canUseHostControls;
  const isLive = tournamentStatus === "live";

  return (
    <div className="space-y-6">
      {showBracketTree ? (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Trophy className={cn("h-5 w-5", accentClass)} />
            Tournament bracket
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-cp-muted">
            {isOfficial
              ? "Single-elimination draw — follow each round as teams advance toward the title."
              : "Single-elimination tree — winners advance, losers are out."}
          </p>
          <div className="mt-5 rounded-2xl border border-cp-border bg-cp-card/60 p-4 sm:p-6">
            <OfficialBracketView matches={matches} />
          </div>
        </section>
      ) : null}

      {liveMatches.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200">
            <Radio className="h-3.5 w-3.5" />
            Live now
          </p>
          <ul className="mt-3 space-y-2">
            {liveMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-cp-card/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-foreground">
                  R{m.roundNumber} M{m.matchNumber}: {m.teamAName} vs {m.teamBName}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-amber-100">
                  {m.scoreA ?? 0} – {m.scoreB ?? 0}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cp-muted">
            Scores refresh automatically as the host updates them from Manage → Live scoring.
          </p>
        </section>
      ) : null}

      {canManage ? (
        <section className={cn("rounded-2xl border bg-cp-card p-4 sm:p-5", borderAccent)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Host tools</h3>
              <p className="mt-1 max-w-xl text-sm text-cp-muted">
                {isLive
                  ? "This tab is view-only for the public. Score bracket matches on court from Manage → Live scoring."
                  : "Bracket setup and courtside scoring live in the manage dashboard — not on this public page."}
              </p>
            </div>
            <Button
              asChild
              className={cn(
                "shrink-0",
                isOfficial ? "bg-cp-primary hover:bg-cp-primary-light" : "bg-emerald-600 hover:bg-emerald-500",
              )}
            >
              <Link href={isLive ? manageScoringUrl : manageBracketUrl}>
                {isLive ? "Open Live scoring" : "Open Bracket setup"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <p className="text-center text-sm text-cp-muted sm:text-left">
          Bracket results update here when matches are played. Score input is handled by the host
          from the manage dashboard.
        </p>
      )}
    </div>
  );
}
