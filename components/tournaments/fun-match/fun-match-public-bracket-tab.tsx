"use client";

import { useMemo, useState } from "react";
import { GitBranch, History } from "lucide-react";
import { BracketSnapshotDialog } from "@/components/tournaments/fun-match/bracket-snapshot-dialog";
import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTournamentBracket } from "@/hooks/use-tournament-bracket";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { hasPublicBracketTree } from "@/lib/tournaments/brackets/has-public-bracket";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import { cn } from "@/lib/utils";

type FunMatchPublicBracketTabProps = {
  sportSlug: string;
  slug: string;
  userTeamId: string | null;
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
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-cp-border/70 bg-cp-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:border-emerald-500/40 hover:bg-cp-elevated/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {teamA ?? "TBD"}{" "}
                    <span className="text-cp-muted">vs</span> {teamB ?? "TBD"}
                  </p>
                  {m.teamAPlayers?.length || m.teamBPlayers?.length ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-cp-muted">
                      {teamA && m.teamAPlayers?.length ? (
                        <span className="block truncate">
                          <span className="font-medium text-foreground/80">{teamA}:</span>{" "}
                          {m.teamAPlayers.join(" · ")}
                        </span>
                      ) : null}
                      {teamB && m.teamBPlayers?.length ? (
                        <span className="mt-0.5 block truncate">
                          <span className="font-medium text-foreground/80">{teamB}:</span>{" "}
                          {m.teamBPlayers.join(" · ")}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-emerald-400/90">Tap to view bracket</p>
                </div>
                <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-emerald-400">
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

export function FunMatchPublicBracketTab({
  sportSlug,
  slug,
  userTeamId,
  historyOnly = false,
}: FunMatchPublicBracketTabProps) {
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
    () =>
      matches.filter(
        (m) => m.status === "in_progress" || m.status === "pending" || m.status === "bye",
      ),
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

  const openSnapshot = (match: BracketMatchView) => {
    setSnapshotMatch(match);
    setSnapshotOpen(true);
  };

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
        <p className="mt-3 text-sm text-cp-muted">
          The elimination bracket will appear here after the host saves seeding from Manage →
          Bracket.
        </p>
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
                <GitBranch className="h-5 w-5 text-emerald-400" />
                Elimination bracket
                {liveMatches.some((m) => m.status === "in_progress") ? (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                    Live
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm text-cp-muted">
                Drag horizontally to explore the tree. Scores update as matches finish.
              </p>
            </div>
          </div>
          <BracketTreeView
            matches={matches}
            highlightTeamIds={userTeamId ? [userTeamId] : []}
            emptyMessage="Bracket is being prepared…"
          />
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
                onSelectMatch={openSnapshot}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className={cn("text-center text-sm text-cp-muted")}>
          Completed bracket rounds will be archived here.
        </p>
      )}

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
