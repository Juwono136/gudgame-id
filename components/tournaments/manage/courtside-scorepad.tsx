"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Radio, X } from "lucide-react";
import { FunMatchRoundMatchCard } from "@/components/tournaments/fun-match/fun-match-round-match-card";
import { Button } from "@/components/ui/button";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { ScoringRules } from "@/lib/tournaments/scoring/engine";
import type { MatchGameRules } from "@/lib/tournaments/scoring/game-mode";
import type { ClassicSetRules } from "@/lib/tournaments/scoring/classic-sets";
import { cn } from "@/lib/utils";

type CourtView = { id: string; name: string; courtNumber: number };

type CourtsideScorepadProps = {
  open: boolean;
  courtId: string | null;
  courts: CourtView[];
  matchByCourt: Map<string, ReclubMatchView>;
  onSelectCourt: (courtId: string) => void;
  onClose: () => void;
  onScoreChange: (
    matchId: string,
    input: {
      scoreA: number;
      scoreB: number;
      action?: "increment" | "decrement" | "set" | "set_points" | "next_game";
      side?: "a" | "b";
      targetPoints?: number;
      scorerName?: string;
      scorerUserId?: string;
      servingSide?: "a" | "b";
      serverName?: string;
      serverUserId?: string;
      isBracket?: boolean;
      isGroup?: boolean;
    },
  ) => void | Promise<unknown>;
  onCompleteMatch: (match: ReclubMatchView) => void;
  canManage?: boolean;
  pointsPerMatch: number;
  scoringRules?: ScoringRules;
  gameRules?: MatchGameRules | null;
  classicSetRules?: ClassicSetRules | null;
  scoreEntryMode?: "live" | "paper";
  sportSlug?: string;
  tournamentSlug?: string;
  onOverrideSuccess?: () => void;
  accentVariant?: "fun" | "official";
};

/**
 * Immersive fullscreen courtside scorepad — solid opaque shell so command-center
 * content never ghosts through. One live court at a time for field scorekeepers.
 */
export function CourtsideScorepad({
  open,
  courtId,
  courts,
  matchByCourt,
  onSelectCourt,
  onClose,
  onScoreChange,
  onCompleteMatch,
  canManage,
  pointsPerMatch,
  scoringRules,
  gameRules = null,
  classicSetRules = null,
  scoreEntryMode = "live",
  sportSlug,
  tournamentSlug,
  onOverrideSuccess,
  accentVariant = "fun",
}: CourtsideScorepadProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const liveCourts = useMemo(
    () => courts.filter((c) => matchByCourt.get(c.id)?.status === "in_progress"),
    [courts, matchByCourt],
  );

  const activeCourt =
    liveCourts.find((c) => c.id === courtId) ?? liveCourts[0] ?? null;
  const activeMatch = activeCourt ? (matchByCourt.get(activeCourt.id) ?? null) : null;

  const courtIndex = activeCourt
    ? liveCourts.findIndex((c) => c.id === activeCourt.id)
    : -1;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && courtIndex > 0) {
        onSelectCourt(liveCourts[courtIndex - 1]!.id);
      }
      if (e.key === "ArrowRight" && courtIndex >= 0 && courtIndex < liveCourts.length - 1) {
        onSelectCourt(liveCourts[courtIndex + 1]!.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onSelectCourt, courtIndex, liveCourts]);

  if (!open || !mounted) return null;

  const shell = (
    <div
      className="fixed inset-0 z-[130] flex flex-col bg-cp-bg text-foreground"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="dialog"
      aria-modal
      aria-label="Courtside scorepad"
    >
      {/* Solid underlay — never translucent (avoids ghosting command center). */}
      <div className="pointer-events-none absolute inset-0 bg-cp-bg" aria-hidden />

      <header className="relative z-[1] flex shrink-0 items-center justify-between gap-2 border-b border-cp-border bg-cp-card px-3 py-2.5 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 gap-1.5 touch-manipulation px-2 sm:px-3"
          onClick={onClose}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="flex items-center justify-center gap-1.5 truncate text-sm font-semibold text-foreground">
            <Radio
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                accentVariant === "official" ? "text-cp-primary" : "text-emerald-400",
              )}
              aria-hidden
            />
            <span className="truncate">{activeCourt?.name ?? "No live court"}</span>
          </p>
          <p className="text-[11px] text-cp-muted">Courtside · field scorepad</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 touch-manipulation"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </header>

      {liveCourts.length > 1 ? (
        <div className="relative z-[1] flex shrink-0 items-center gap-1 border-b border-cp-border bg-cp-card px-2 py-2 sm:px-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 touch-manipulation border-cp-border bg-cp-elevated"
            disabled={courtIndex <= 0}
            onClick={() => {
              if (courtIndex > 0) onSelectCourt(liveCourts[courtIndex - 1]!.id);
            }}
            aria-label="Previous live court"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {liveCourts.map((c) => {
              const m = matchByCourt.get(c.id);
              const selected = c.id === activeCourt?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCourt(c.id)}
                  className={cn(
                    "min-w-[4.75rem] shrink-0 touch-manipulation rounded-xl border px-2.5 py-2 text-center text-[11px] font-semibold transition-colors",
                    selected
                      ? accentVariant === "official"
                        ? "border-cp-primary bg-cp-primary/20 text-foreground shadow-sm"
                        : "border-emerald-500/70 bg-emerald-500/20 text-foreground shadow-sm"
                      : "border-cp-border bg-cp-elevated text-cp-muted hover:text-foreground",
                  )}
                >
                  <span className="block uppercase tracking-wide">
                    {c.name.replace(/^Court\s+/i, "C")}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {m ? `${m.scoreA ?? 0}–${m.scoreB ?? 0}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 touch-manipulation border-cp-border bg-cp-elevated"
            disabled={courtIndex < 0 || courtIndex >= liveCourts.length - 1}
            onClick={() => {
              if (courtIndex >= 0 && courtIndex < liveCourts.length - 1) {
                onSelectCourt(liveCourts[courtIndex + 1]!.id);
              }
            }}
            aria-label="Next live court"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-cp-bg px-3 py-4 sm:px-5 sm:py-6">
        {activeCourt && activeMatch ? (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
            <FunMatchRoundMatchCard
              match={activeMatch}
              courtId={activeCourt.id}
              courtName={activeCourt.name}
              scorekeeperName={activeMatch.scorekeeperName ?? null}
              canManage={canManage}
              pointsPerMatch={pointsPerMatch}
              scoringRules={scoringRules}
              gameRules={gameRules}
              classicSetRules={classicSetRules}
              scoreEntryMode={scoreEntryMode}
              sportSlug={sportSlug}
              tournamentSlug={tournamentSlug}
              onOverrideSuccess={onOverrideSuccess}
              density="courtside"
              forceExpanded
              accentVariant={accentVariant}
              onScoreChange={(input) =>
                onScoreChange(activeMatch.id, {
                  ...input,
                  isBracket:
                    activeMatch.sourceKind === "bracket" ||
                    activeMatch.playType === "bracket",
                  isGroup:
                    activeMatch.sourceKind === "group_stage" ||
                    activeMatch.playType === "group_stage",
                })
              }
              onComplete={() => onCompleteMatch(activeMatch)}
            />
            <p className="mt-4 pb-2 text-center text-[11px] text-cp-muted">
              {liveCourts.length > 1
                ? "Switch courts above · arrow keys · Esc to exit"
                : "Esc or Back to return to Live scoring"}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm font-medium text-foreground">No live matches on court</p>
            <p className="max-w-sm text-xs text-cp-muted">
              Start a match from the command center, then reopen courtside.
            </p>
            <Button type="button" variant="secondary" className="touch-manipulation" onClick={onClose}>
              Back to Live scoring
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}
