"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerMatchTypeBadge } from "@/components/dashboard/player/competition/player-match-type-badge";
import { formatMatchDate } from "@/lib/account/player-competition/format-match";
import type { PlayerMatchListItem } from "@/lib/account/player-competition/types";
import { dashboardRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const MATCH_LIST_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.1fr)_5.5rem_minmax(0,0.7fr)_minmax(0,1fr)_5.5rem_5.5rem_6.5rem] lg:items-center lg:gap-x-3";

function MatchResultBadge({ match }: { match: PlayerMatchListItem }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
        match.resultType === "win"
          ? "bg-cp-primary/15 text-cp-primary"
          : "bg-red-500/15 text-red-400",
      )}
    >
      {match.score ?? (match.resultType === "win" ? "Win" : "Loss")}
    </span>
  );
}

type PlayerMatchListRowProps = {
  match: PlayerMatchListItem;
};

export function PlayerMatchListRow({ match }: PlayerMatchListRowProps) {
  const detailHref = dashboardRoutes.match(match.id);
  return (
    <li className="px-4 py-4 sm:px-5 lg:px-6">
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{match.tournamentName}</p>
            {match.round ? <p className="mt-0.5 text-xs text-cp-muted">{match.round}</p> : null}
          </div>
          <PlayerMatchTypeBadge tournamentType={match.tournamentType} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Opponents
            </dt>
            <dd className="mt-0.5 text-sm text-cp-muted">{match.opponents}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Sport
            </dt>
            <dd className="mt-0.5 text-sm text-cp-muted">{match.sportName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Date
            </dt>
            <dd className="mt-0.5 text-sm text-cp-muted">{formatMatchDate(match.playedAt)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Result
            </dt>
            <dd className="mt-0.5">
              <MatchResultBadge match={match} />
            </dd>
          </div>
        </dl>

        <Button asChild variant="outline" size="sm" className="h-9 w-full border-cp-border">
          <Link href={detailHref}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </Link>
        </Button>
      </div>

      <div className={cn("hidden", MATCH_LIST_GRID)}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{match.tournamentName}</p>
          {match.round ? <p className="truncate text-xs text-cp-muted">{match.round}</p> : null}
        </div>
        <PlayerMatchTypeBadge tournamentType={match.tournamentType} />
        <p className="min-w-0 truncate text-sm text-cp-muted">{match.sportName ?? "—"}</p>
        <p className="min-w-0 truncate text-sm text-cp-muted">{match.opponents}</p>
        <p className="text-sm text-cp-muted">{formatMatchDate(match.playedAt)}</p>
        <div>
          <MatchResultBadge match={match} />
        </div>
        <div className="text-right">
          <Button asChild variant="outline" size="sm" className="h-8 border-cp-border px-3">
            <Link href={detailHref}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Details
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

export { MATCH_LIST_GRID };
