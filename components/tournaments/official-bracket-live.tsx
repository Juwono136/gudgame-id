"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Swords, Trophy } from "lucide-react";
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
import { cn } from "@/lib/utils";

type OfficialBracketLiveProps = {
  sportSlug: string;
  slug: string;
  matches: BracketMatchView[];
  canManage: boolean;
};

function formatMatchOption(m: BracketMatchView): string {
  const label = `R${m.roundNumber} M${m.matchNumber}: ${m.teamAName} vs ${m.teamBName}`;
  return m.status === "in_progress" ? `${label} (live)` : label;
}

export function OfficialBracketLive({
  sportSlug,
  slug,
  matches,
  canManage,
}: OfficialBracketLiveProps) {
  const { confirm } = useConfirmDialog();
  const liveScore = useUpdateBracketLiveScore(sportSlug, slug);
  const finalizeScore = useSubmitBracketScore(sportSlug, slug);
  const [selectedId, setSelectedId] = useState<string>("");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playable = useMemo(
    () =>
      matches.filter(
        (m) => m.status !== "bye" && m.status !== "completed" && m.teamAName && m.teamBName,
      ),
    [matches],
  );

  const selected = playable.find((m) => String(m.id) === selectedId) ?? null;

  useEffect(() => {
    if (!playable.length) {
      setSelectedId("");
      return;
    }
    const stillValid = playable.some((m) => String(m.id) === selectedId);
    if (!selectedId || !stillValid) {
      const preferred =
        playable.find((m) => m.status === "in_progress") ?? playable[0];
      setSelectedId(String(preferred.id));
    }
  }, [playable, selectedId]);

  useEffect(() => {
    if (selected) {
      setScoreA(selected.scoreA ?? 0);
      setScoreB(selected.scoreB ?? 0);
    }
  }, [selected?.id, selected?.scoreA, selected?.scoreB]);

  const persist = (a: number, b: number) => {
    if (!selected || !canManage) return;
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = setTimeout(() => {
      liveScore.mutate({ matchId: selected.id, scoreA: a, scoreB: b });
    }, 400);
  };

  const handleFinalize = async () => {
    if (!selected) return;
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
          setSelectedId("");
          setScoreA(0);
          setScoreB(0);
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      {canManage && playable.length > 0 ? (
        <section className="rounded-2xl border border-cp-primary/30 bg-cp-card p-4 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cp-primary">
            Courtside scoring
          </h3>
          <p className="mt-1 text-sm text-cp-muted">
            Update scores live during play, then finalize when the match ends.
          </p>

          <div className="mt-4 space-y-2">
            <Label htmlFor="bracket-match-select" className="text-xs text-cp-muted">
              Active match
            </Label>
            <Select value={selectedId || undefined} onValueChange={setSelectedId}>
              <SelectTrigger
                id="bracket-match-select"
                className={cn(
                  "h-11 w-full border-cp-border bg-cp-elevated text-left",
                  !selectedId && "text-cp-muted",
                )}
              >
                <SelectValue placeholder="Choose a match to score…" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(100vw-2rem,28rem)]">
                {playable.map((m) => (
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
                className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
                disabled={finalizeScore.isPending}
                onClick={() => void handleFinalize()}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Finalize match & advance bracket
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-6 text-sm text-cp-muted">
              <Swords className="h-5 w-5 shrink-0 text-cp-primary/70" />
              <p>Select a match above to open the live scoreboard.</p>
            </div>
          )}
        </section>
      ) : null}

      <OfficialBracketView matches={matches} />
    </div>
  );
}
