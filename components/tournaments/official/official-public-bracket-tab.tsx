"use client";

import { formatPlayerNameList } from "@/lib/format/player-names";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch, History, Radio, Trophy } from "lucide-react";
import { BracketSnapshotDialog } from "@/components/tournaments/fun-match/bracket-snapshot-dialog";
import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { hasPublicBracketTree } from "@/lib/tournaments/brackets/has-public-bracket";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { cn } from "@/lib/utils";

type OfficialPublicBracketTabProps = {
  sportSlug: string;
  slug: string;
  participant: TournamentParticipantContext;
  tournamentStatus: string;
  userTeamId?: string | null;
  historyOnly?: boolean;
};

function displayTeamName(name: string | null): string | null {
  if (!name?.trim() || name.trim().toUpperCase() === "BYE") return null;
  return name;
}

function BracketHistoryCard({
  roundNumber,
  matches,
  maxRound,
  onSelectMatch,
}: {
  roundNumber: number;
  matches: BracketMatchView[];
  maxRound: number;
  onSelectMatch: (match: BracketMatchView) => void;
}) {
  return (
    <article className="rounded-xl border border-cp-border bg-cp-elevated/20 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-cp-muted">
        {getBracketRoundLabel(roundNumber, maxRound)} · History
      </h4>
      <ul className="mt-3 space-y-2">
        {matches.map((m) => {
          const teamA = displayTeamName(m.teamAName);
          const teamB = displayTeamName(m.teamBName);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelectMatch(m)}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-cp-border/70 bg-cp-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:border-cp-primary/40 hover:bg-cp-elevated/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {teamA ?? "TBD"}{" "}
                    <span className="text-cp-muted">vs</span> {teamB ?? "TBD"}
                  </p>
                  {(m.teamAPlayers.length > 0 || m.teamBPlayers.length > 0) ? (
                    <p className="mt-1 text-xs text-cp-muted">
                      {[formatPlayerNameList(m.teamAPlayers), formatPlayerNameList(m.teamBPlayers)]
                        .filter(Boolean)
                        .join(" vs ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-cp-primary/90">Tap to view bracket</p>
                </div>
                <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-cp-primary">
                  {m.scoreA ?? 0} : {m.scoreB ?? 0}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function OfficialPublicBracketTab({
  sportSlug,
  slug,
  participant,
  tournamentStatus,
  userTeamId = null,
  historyOnly = false,
}: OfficialPublicBracketTabProps) {
  const { data, isLoading } = useTournamentBracket(sportSlug, slug);
  const matches = data?.matches ?? [];
  const generated = hasPublicBracketTree(data);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotMatch, setSnapshotMatch] = useState<BracketMatchView | null>(null);

  const maxRound = useMemo(
    () => (matches.length ? Math.max(...matches.map((m) => m.roundNumber)) : 1),
    [matches],
  );

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === "in_progress"),
    [matches],
  );

  const historyByRound = useMemo(() => {
    const completed = matches.filter((m) => m.status === "completed");
    const map = new Map<number, BracketMatchView[]>();
    for (const m of completed) {
      const list = map.get(m.roundNumber) ?? [];
      list.push(m);
      map.set(m.roundNumber, list);
    }
    return [...map.entries()].sort(([a], [b]) => b - a);
  }, [matches]);

  const highlightTeamIds = useMemo(() => {
    if (!snapshotMatch) return userTeamId ? [userTeamId] : [];
    const ids = [snapshotMatch.teamAId, snapshotMatch.teamBId, snapshotMatch.winnerTeamId].filter(
      (id): id is string => Boolean(id),
    );
    return ids.length ? ids : userTeamId ? [userTeamId] : [];
  }, [snapshotMatch, userTeamId]);

  const manageScoringUrl = `${publicSportRoutes.tournamentManage(sportSlug, slug)}?section=scoring`;
  const manageBracketUrl = `${publicSportRoutes.tournamentManage(sportSlug, slug)}?section=bracket`;
  const canManage = participant.canUseHostControls;
  const isLive = tournamentStatus === "live";

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading bracket…" />
      </div>
    );
  }

  if (!generated) {
    return (
      <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 p-8 text-center">
        <GitBranch className="mx-auto h-8 w-8 text-cp-muted/60" />
        <h2 className="mt-3 text-lg font-semibold text-foreground">Bracket preparing</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-cp-muted">
          The elimination tree appears here once the host opens bracket setup. Teams show up as
          they are placed — no need to wait for a full roster.
        </p>
        {canManage ? (
          <Button asChild className="mt-5 bg-cp-primary hover:bg-cp-primary-light">
            <Link href={manageBracketUrl}>Open bracket setup</Link>
          </Button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {!historyOnly ? (
        <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Trophy className="h-5 w-5 text-cp-primary" />
                Tournament bracket
                {liveMatches.length > 0 ? (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                    Live
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm text-cp-muted">
                Single-elimination draw — teams appear as the host places them. Empty slots stay
                open until filled.
              </p>
            </div>
          </div>
          <BracketTreeView
            matches={matches}
            showEmptySlots
            highlightTeamIds={userTeamId ? [userTeamId] : []}
            emptyMessage="Bracket structure is being prepared…"
          />
        </section>
      ) : null}

      {liveMatches.length > 0 && !historyOnly ? (
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
                  R{m.roundNumber} M{m.matchNumber}: {m.teamAName ?? "TBD"} vs {m.teamBName ?? "TBD"}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-amber-100">
                  {m.scoreA ?? 0} – {m.scoreB ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {historyByRound.length > 0 ? (
        <section className="space-y-4">
          {!historyOnly ? (
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <History className="h-4 w-4 text-cp-muted" />
              Bracket history
            </h3>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {historyByRound.map(([roundNumber, roundMatches]) => (
              <BracketHistoryCard
                key={roundNumber}
                roundNumber={roundNumber}
                matches={roundMatches.sort((a, b) => a.matchNumber - b.matchNumber)}
                maxRound={maxRound}
                onSelectMatch={(m) => {
                  setSnapshotMatch(m);
                  setSnapshotOpen(true);
                }}
              />
            ))}
          </div>
        </section>
      ) : !historyOnly ? (
        <p className={cn("text-center text-sm text-cp-muted")}>
          Completed bracket rounds will be archived here.
        </p>
      ) : null}

      {!historyOnly && canManage ? (
        <section className="rounded-2xl border border-cp-primary/25 bg-cp-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Host tools</h3>
              <p className="mt-1 max-w-xl text-sm text-cp-muted">
                {isLive
                  ? "This tab is view-only for the public. Score bracket matches on court from Manage → Live scoring."
                  : "Bracket setup and courtside scoring live in the manage dashboard."}
              </p>
            </div>
            <Button asChild className="shrink-0 bg-cp-primary hover:bg-cp-primary-light">
              <Link href={isLive ? manageScoringUrl : manageBracketUrl}>
                {isLive ? "Open Live scoring" : "Open Bracket setup"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <BracketSnapshotDialog
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        matches={matches}
        highlightTeamIds={highlightTeamIds}
        title={
          snapshotMatch
            ? `${getBracketRoundLabel(snapshotMatch.roundNumber, maxRound)} · M${snapshotMatch.matchNumber}`
            : "Bracket snapshot"
        }
        description="Full bracket tree at the current state. Drag horizontally to explore."
      />
    </div>
  );
}
