"use client";

import Link from "next/link";
import { CheckCircle2, Radio, Swords, Trophy } from "lucide-react";
import { OfficialBracketLive } from "@/components/tournaments/official-bracket-live";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { publicSportRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type BracketScoreSectionProps = {
  sportSlug: string;
  slug: string;
  matches: BracketMatchView[];
  participant: TournamentParticipantContext;
  pointsPerMatch: number;
};

export function BracketScoreSection({
  sportSlug,
  slug,
  matches,
  participant,
  pointsPerMatch,
}: BracketScoreSectionProps) {
  const live = matches.filter((m) => m.status === "in_progress");
  const pending = matches.filter(
    (m) => m.status === "pending" && m.teamAName && m.teamBName,
  );
  const completed = matches.filter((m) => m.status === "completed");
  const allDone = matches.length > 0 && live.length === 0 && pending.length === 0;

  const manageScoringUrl = `${publicSportRoutes.tournamentManage(sportSlug, slug)}?section=scoring`;

  return (
    <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Swords className="h-4 w-4 text-cp-primary" />
            Score matches
          </h3>
          <p className="mt-1 text-sm text-cp-muted">
            Update live bracket scores here, or use the Live scoring tab for multi-court view.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={manageScoringUrl}>
            <Radio className="mr-1.5 h-3.5 w-3.5" />
            Open live scoring
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="muted">{live.length} live</Badge>
        <Badge variant="muted">{pending.length} ready</Badge>
        <Badge variant="muted">{completed.length} completed</Badge>
      </div>

      {allDone ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-6 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="font-medium text-foreground">Bracket complete</p>
          <p className="max-w-sm text-sm text-cp-muted">
            All matches have been scored. Results are shown in the bracket tree above.
          </p>
        </div>
      ) : live.length > 0 || pending.length > 0 ? (
        <div className="mt-6">
          <OfficialBracketLive
            sportSlug={sportSlug}
            slug={slug}
            matches={matches.filter(
              (m) => m.status === "in_progress" || (m.status === "pending" && m.teamAName && m.teamBName),
            )}
            participant={participant}
            pointsPerMatch={pointsPerMatch}
            showBracketTree={false}
            variant="official"
            officialScoringEnabled
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-cp-border px-4 py-8 text-center text-sm text-cp-muted">
          <Trophy className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Assign teams to round one, then return here to score matches as they go live.
        </div>
      )}

      {completed.length > 0 ? (
        <div className="mt-6 border-t border-cp-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
            Recent results
          </p>
          <ul className="mt-3 space-y-2">
            {completed.slice(-4).reverse().map((m) => (
              <li
                key={m.id}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border border-cp-border/70 bg-cp-elevated/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                )}
              >
                <span className="text-sm text-foreground">
                  R{m.roundNumber} · {m.teamAName} vs {m.teamBName}
                </span>
                <span className="font-mono text-sm font-semibold text-cp-primary">
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
