"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Swords, Trophy } from "lucide-react";
import { toast } from "sonner";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
import { OfficialBracketView } from "@/components/tournaments/official-bracket-view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSubmitBracketScore,
  useUpdateBracketLiveScore,
} from "@/hooks/use-tournament-bracket";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { canScoreBracketMatch } from "@/lib/tournaments/participant-access";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { cn } from "@/lib/utils";

type OfficialBracketLiveProps = {
  sportSlug: string;
  slug: string;
  matches: BracketMatchView[];
  participant: TournamentParticipantContext;
  /** When false, only courtside scoring is shown (tree rendered elsewhere). */
  showBracketTree?: boolean;
  variant?: "official" | "reclub";
};

function formatMatchOption(m: BracketMatchView): string {
  const label = `R${m.roundNumber} M${m.matchNumber}: ${m.teamAName} vs ${m.teamBName}`;
  return m.status === "in_progress" ? `${label} (live)` : label;
}

export function OfficialBracketLive({
  sportSlug,
  slug,
  matches,
  participant,
  showBracketTree = true,
  variant = "official",
}: OfficialBracketLiveProps) {
  const { confirm } = useConfirmDialog();
  const liveScore = useUpdateBracketLiveScore(sportSlug, slug);
  const finalizeScore = useSubmitBracketScore(sportSlug, slug);
  const [selectedId, setSelectedId] = useState<string>("");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allPlayable = useMemo(
    () =>
      matches.filter(
        (m) => m.status !== "bye" && m.status !== "completed" && m.teamAName && m.teamBName,
      ),
    [matches],
  );

  const scorableMatches = useMemo(
    () =>
      allPlayable.filter((m) => canScoreBracketMatch(participant, m)),
    [allPlayable, participant],
  );

  const resolvedSelectedId = useMemo(() => {
    if (!scorableMatches.length) return null;
    if (selectedId && scorableMatches.some((m) => String(m.id) === selectedId)) {
      return selectedId;
    }
    const preferred =
      scorableMatches.find((m) => m.status === "in_progress") ?? scorableMatches[0];
    return String(preferred.id);
  }, [scorableMatches, selectedId]);

  const selected =
    resolvedSelectedId != null
      ? (scorableMatches.find((m) => String(m.id) === resolvedSelectedId) ?? null)
      : null;

  useEffect(() => {
    if (resolvedSelectedId && resolvedSelectedId !== selectedId) {
      setSelectedId(resolvedSelectedId);
    }
  }, [resolvedSelectedId, selectedId]);

  useEffect(() => {
    if (selected) {
      setScoreA(selected.scoreA ?? 0);
      setScoreB(selected.scoreB ?? 0);
    }
  }, [selected?.id, selected?.scoreA, selected?.scoreB]);

  const canEditSelected = selected
    ? canScoreBracketMatch(participant, selected)
    : false;

  const persist = (a: number, b: number) => {
    if (!selected || !canEditSelected) return;
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = setTimeout(() => {
      liveScore.mutate({ matchId: selected.id, scoreA: a, scoreB: b });
    }, 400);
  };

  const handleFinalize = async () => {
    if (!selected || !canEditSelected) return;
    if (scoreA === scoreB) {
      toast.error("Set a winner — scores cannot be tied in elimination");
      return;
    }
    const ok = await confirm({
      title: "Finalize match result?",
      description: "This advances the winner in the bracket and syncs player stats.",
      confirmLabel: "Save result",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    finalizeScore.mutate(
      { matchId: selected.id, scoreA, scoreB },
      {
        onSuccess: () => {
          setScoreA(0);
          setScoreB(0);
        },
      },
    );
  };

  const isOfficial = variant === "official";
  const accentClass = isOfficial ? "text-cp-primary" : "text-emerald-400";
  const borderAccent = isOfficial ? "border-cp-primary/30" : "border-emerald-500/30";

  return (
    <div className="space-y-8">
      {showBracketTree ? (
        <section>
          <h2 className={cn("flex items-center gap-2 text-lg font-semibold text-foreground")}>
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

      {participant.canUseCourtsideScoring && scorableMatches.length > 0 && resolvedSelectedId ? (
        <section className={cn("rounded-2xl border bg-cp-card p-4 sm:p-6", borderAccent)}>
          <h3 className={cn("text-sm font-semibold uppercase tracking-wider", accentClass)}>
            Courtside scoring
          </h3>
          <p className="mt-1 text-sm text-cp-muted">
            {participant.isHost
              ? "Update scores live during play, then finalize when the match ends."
              : "Score matches your squad is playing in — finalize when the match ends."}
          </p>

          <div className="mt-4 space-y-2">
            <Label htmlFor="bracket-match-select" className="text-xs text-cp-muted">
              Active match
            </Label>
            <Select value={resolvedSelectedId} onValueChange={setSelectedId}>
              <SelectTrigger
                id="bracket-match-select"
                className="h-11 w-full border-cp-border bg-cp-elevated text-left"
              >
                <SelectValue placeholder="Choose a match to score…" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(100vw-2rem,28rem)]">
                {scorableMatches.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)} className="py-2.5">
                    <span className="line-clamp-2 text-left">{formatMatchOption(m)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected ? (
            <div className="mt-6 space-y-4">
              <LiveScoreboard
                teamAName={selected.teamAName ?? "Team A"}
                teamBName={selected.teamBName ?? "Team B"}
                scoreA={scoreA}
                scoreB={scoreB}
                onScoreAChange={(n) => {
                  setScoreA(n);
                  persist(n, scoreB);
                }}
                onScoreBChange={(n) => {
                  setScoreB(n);
                  persist(scoreA, n);
                }}
                disabled={liveScore.isPending || finalizeScore.isPending}
              />
              <Button
                className={cn(
                  "w-full sm:w-auto",
                  isOfficial
                    ? "bg-cp-primary hover:bg-cp-primary-light"
                    : "bg-emerald-600 hover:bg-emerald-500",
                )}
                disabled={finalizeScore.isPending}
                onClick={() => void handleFinalize()}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Finalize match & advance bracket
              </Button>
            </div>
          ) : null}
        </section>
      ) : participant.isAuthenticated && !participant.isParticipant ? (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-4 py-5 text-sm text-cp-muted">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Join a squad to access courtside scoring. Everyone can view the bracket tree above.</p>
        </div>
      ) : participant.canUseCourtsideScoring && allPlayable.length > 0 && !scorableMatches.length ? (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-4 py-5 text-sm text-cp-muted">
          <Swords className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            No active matches for your squad right now. You&apos;ll see scoring controls when your
            team is scheduled to play.
          </p>
        </div>
      ) : null}
    </div>
  );
}
