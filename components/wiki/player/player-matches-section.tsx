"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import { PlayerHistoryDialog } from "@/components/wiki/player/player-history-dialog";
import {
  formatMatchPlayedAt,
  formatMatchResultLabel,
  formatPlayerTournamentResult,
} from "@/lib/account/player-competition/format-outcome";
import type { PlayerMatchListItem } from "@/lib/account/player-competition/types";
import type { PlayerTournamentListItem } from "@/lib/account/player-competition/types";
import { cn } from "@/lib/utils";

type HistoryBrowseProps = {
  sportSlug?: string;
  playerSlug?: string;
  playerName?: string;
};

type PlayerRecentMatchesSectionProps = HistoryBrowseProps & {
  matches?: PlayerMatchListItem[];
  viewAllHref?: string;
};

type PlayerTournamentHistorySectionProps = HistoryBrowseProps & {
  tournaments?: PlayerTournamentListItem[];
  viewAllHref?: string;
  createReclubHref?: string;
};

function ViewDetailButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 text-cp-primary hover:bg-cp-primary/10 hover:text-cp-primary"
      onClick={onClick}
    >
      View detail
      <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}

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
  sportSlug,
  playerSlug,
  playerName = "Player",
}: PlayerRecentMatchesSectionProps) {
  const [open, setOpen] = useState(false);
  const hasMatches = matches.length > 0;
  const canBrowsePublic = Boolean(sportSlug && playerSlug);

  return (
    <>
      <PlayerPageCard
        title="Recent matches"
        description="Latest recorded results"
        action={
          canBrowsePublic ? (
            <ViewDetailButton onClick={() => setOpen(true)} />
          ) : viewAllHref ? (
            <ViewAllAction href={viewAllHref} />
          ) : null
        }
      >
        <div className="overflow-hidden rounded-xl border border-cp-border">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-cp-border bg-cp-elevated/50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:grid-cols-[6.5rem_1.4fr_auto] sm:text-xs">
            <span className="hidden sm:block">Date</span>
            <span>Event</span>
            <span className="text-right">Result</span>
          </div>

          {hasMatches ? (
            <ul className="divide-y divide-cp-border">
              {matches.map((match) => (
                <li
                  key={match.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[6.5rem_1.4fr_auto]"
                >
                  <span className="hidden text-xs text-cp-muted sm:block">
                    {formatMatchPlayedAt(match.playedAt)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {match.tournamentName}
                    </p>
                    <p className="truncate text-xs text-cp-muted">
                      <span className="sm:hidden">{formatMatchPlayedAt(match.playedAt)}
                      {match.round ? " · " : ""}</span>
                      {match.round ??
                        (match.tournamentType === "official" ? "Official" : "Fun Match")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 justify-self-end rounded-full px-2.5 py-1 text-xs font-semibold",
                      match.resultType === "win"
                        ? "bg-cp-primary/15 text-cp-primary"
                        : "bg-red-500/15 text-red-400",
                    )}
                  >
                    {formatMatchResultLabel(match)}
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
              {canBrowsePublic ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-cp-border"
                  onClick={() => setOpen(true)}
                >
                  Browse match history
                </Button>
              ) : viewAllHref ? (
                <Button asChild variant="outline" size="sm" className="mt-2 border-cp-border">
                  <Link href={viewAllHref}>Browse match history</Link>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </PlayerPageCard>

      {canBrowsePublic ? (
        <PlayerHistoryDialog
          open={open}
          onOpenChange={setOpen}
          kind="matches"
          playerName={playerName}
          sportSlug={sportSlug!}
          playerSlug={playerSlug!}
        />
      ) : null}
    </>
  );
}

export function PlayerTournamentHistorySection({
  tournaments = [],
  viewAllHref,
  createReclubHref,
  sportSlug,
  playerSlug,
  playerName = "Player",
}: PlayerTournamentHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const hasTournaments = tournaments.length > 0;
  const canBrowsePublic = Boolean(sportSlug && playerSlug);

  return (
    <>
      <PlayerPageCard
        title="Tournament history"
        description="Events joined, hosted, and completed"
        action={
          canBrowsePublic ? (
            <ViewDetailButton onClick={() => setOpen(true)} />
          ) : viewAllHref ? (
            <ViewAllAction href={viewAllHref} />
          ) : null
        }
      >
        <div className="overflow-hidden rounded-xl border border-cp-border">
          <div className="grid grid-cols-[3.25rem_1.4fr_auto] gap-2 border-b border-cp-border bg-cp-elevated/50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:grid-cols-[4rem_1.6fr_auto] sm:text-xs">
            <span>Year</span>
            <span>Event</span>
            <span className="text-right">Result</span>
          </div>

          {hasTournaments ? (
            <ul className="divide-y divide-cp-border">
              {tournaments.map((row) => {
                const result = formatPlayerTournamentResult(row);
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-[3.25rem_1.4fr_auto] items-center gap-2 px-4 py-3 text-sm sm:grid-cols-[4rem_1.6fr_auto]"
                  >
                    <span className="font-semibold text-foreground">{row.year}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{row.tournamentName}</p>
                      {row.category ? (
                        <p className="truncate text-xs text-cp-muted">{row.category}</p>
                      ) : null}
                    </div>
                    <span className="truncate text-right text-xs font-semibold text-cp-primary sm:text-sm">
                      {result}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Trophy className="h-8 w-8 text-cp-text-dim" />
              <p className="text-sm font-medium text-foreground">No tournament history yet</p>
              <p className="max-w-sm text-xs text-cp-muted">
                Results and event status will be listed here once tournament data is available.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {createReclubHref ? (
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                    <Link href={createReclubHref}>Create free Fun Match</Link>
                  </Button>
                ) : null}
                {canBrowsePublic ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-cp-border"
                    onClick={() => setOpen(true)}
                  >
                    Browse tournament history
                  </Button>
                ) : viewAllHref ? (
                  <Button asChild variant="outline" size="sm" className="border-cp-border">
                    <Link href={viewAllHref}>Browse tournament history</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </PlayerPageCard>

      {canBrowsePublic ? (
        <PlayerHistoryDialog
          open={open}
          onOpenChange={setOpen}
          kind="tournaments"
          playerName={playerName}
          sportSlug={sportSlug!}
          playerSlug={playerSlug!}
        />
      ) : null}
    </>
  );
}
