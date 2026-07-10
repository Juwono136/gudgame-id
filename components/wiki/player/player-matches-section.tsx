import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import type { PlayerMatchListItem } from "@/lib/account/player-competition/types";
import type { PlayerTournamentListItem } from "@/lib/account/player-competition/types";
import { cn } from "@/lib/utils";

type PlayerRecentMatchesSectionProps = {
  matches?: PlayerMatchListItem[];
  viewAllHref?: string;
};

type PlayerTournamentHistorySectionProps = {
  tournaments?: PlayerTournamentListItem[];
  viewAllHref?: string;
  createReclubHref?: string;
};

function ViewAllAction({ href }: { href: string }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="h-8 gap-1 text-cp-primary hover:bg-cp-primary/10 hover:text-cp-primary"
    >
      <Link href={href}>
        View all
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}

export function PlayerRecentMatchesSection({
  matches = [],
  viewAllHref,
}: PlayerRecentMatchesSectionProps) {
  const hasMatches = matches.length > 0;

  return (
    <PlayerPageCard
      title="Recent matches"
      description="Last recorded tournament matches"
      action={viewAllHref ? <ViewAllAction href={viewAllHref} /> : null}
    >
      <div className="overflow-hidden rounded-xl border border-cp-border">
        <div className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-cp-border bg-cp-elevated/50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
          <span>Tournament</span>
          <span className="hidden sm:block">Opponents</span>
          <span className="text-right">Result</span>
        </div>

        {hasMatches ? (
          <ul className="divide-y divide-cp-border">
            {matches.map((match) => (
              <li
                key={match.id}
                className="grid grid-cols-[1.2fr_1fr_auto] items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {match.tournamentName}
                  </p>
                  {match.round ? (
                    <p className="truncate text-xs text-cp-muted">{match.round}</p>
                  ) : null}
                </div>
                <p className="hidden truncate text-sm text-cp-muted sm:block">
                  {match.opponents}
                </p>
                <span
                  className={cn(
                    "inline-flex shrink-0 justify-self-end rounded-full px-2.5 py-1 text-xs font-semibold",
                    match.resultType === "win"
                      ? "bg-cp-primary/15 text-cp-primary"
                      : "bg-red-500/15 text-red-400",
                  )}
                >
                  {match.score ?? (match.resultType === "win" ? "Win" : "Loss")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <Swords className="h-8 w-8 text-cp-text-dim" />
            <p className="text-sm font-medium text-foreground">No recent matches</p>
            <p className="max-w-sm text-xs text-cp-muted">
              Match history will appear here after this player competes in tournaments on
              Gud Game.
            </p>
            {viewAllHref ? (
              <Button asChild variant="outline" size="sm" className="mt-2 border-cp-border">
                <Link href={viewAllHref}>Browse match history</Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </PlayerPageCard>
  );
}

export function PlayerTournamentHistorySection({
  tournaments = [],
  viewAllHref,
  createReclubHref,
}: PlayerTournamentHistorySectionProps) {
  const hasTournaments = tournaments.length > 0;

  return (
    <PlayerPageCard
      title="Tournament history"
      description="Season-by-season placements"
      action={viewAllHref ? <ViewAllAction href={viewAllHref} /> : null}
    >
      <div className="overflow-hidden rounded-xl border border-cp-border">
        <div className="grid grid-cols-4 gap-2 border-b border-cp-border bg-cp-elevated/50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
          <span>Year</span>
          <span className="col-span-2">Tournament</span>
          <span className="text-right">Placement</span>
        </div>

        {hasTournaments ? (
          <ul className="divide-y divide-cp-border">
            {tournaments.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-4 items-center gap-2 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-foreground">{row.year}</span>
                <span className="col-span-2 truncate font-medium text-foreground">
                  {row.tournamentName}
                </span>
                <span className="truncate text-right font-semibold text-cp-primary">
                  {row.placement}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No tournament history yet</p>
            <p className="max-w-sm text-xs text-cp-muted">
              Placements and categories will be listed here once tournament data is available.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {createReclubHref ? (
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                  <Link href={createReclubHref}>Create free Fun Match</Link>
                </Button>
              ) : null}
              {viewAllHref ? (
                <Button asChild variant="outline" size="sm" className="border-cp-border">
                  <Link href={viewAllHref}>Browse tournament history</Link>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </PlayerPageCard>
  );
}
