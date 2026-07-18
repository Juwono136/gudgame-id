"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatIntraGameScoreLine,
  formatRaceToGamesLabel,
  type MatchGameRules,
  type MatchGameState,
} from "@/lib/tournaments/scoring/game-mode";
import { cn } from "@/lib/utils";

type GameRaceScoreboardProps = {
  teamAName: string;
  teamBName: string;
  gamesA: number;
  gamesB: number;
  gameState: MatchGameState;
  rules: MatchGameRules;
  disabled?: boolean;
  onPointA: (delta: 1 | -1) => void;
  onPointB: (delta: 1 | -1) => void;
  className?: string;
};

/**
 * Dual-layer scoreboard for race-to-N games:
 * - Big numbers = games won (match score, e.g. 3–1)
 * - Rally line = current game points (0/15/30/40)
 */
export function GameRaceScoreboard({
  teamAName,
  teamBName,
  gamesA,
  gamesB,
  gameState,
  rules,
  disabled,
  onPointA,
  onPointB,
  className,
}: GameRaceScoreboardProps) {
  const rallyLine = formatIntraGameScoreLine(
    gameState.currentPointsA,
    gameState.currentPointsB,
    rules.pointStyle,
  );
  const matchComplete = Math.max(gamesA, gamesB) >= rules.raceToGames;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
          {formatRaceToGamesLabel(rules.raceToGames)}
        </p>
        <p className="rounded-full border border-cp-border/70 bg-cp-elevated/40 px-2.5 py-0.5 text-[11px] tabular-nums text-cp-muted">
          Current game {rallyLine}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-cp-border bg-cp-elevated/20 p-3 sm:gap-4 sm:p-4">
        <SideColumn
          name={teamAName}
          games={gamesA}
          disabled={disabled || matchComplete}
          onIncrement={() => onPointA(1)}
          onDecrement={() => onPointA(-1)}
          canDecrement={gameState.currentPointsA > 0 && !matchComplete}
        />
        <div className="flex flex-col items-center gap-1 pb-1">
          <span className="text-2xl font-light text-cp-muted sm:text-3xl">:</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-cp-muted">
            Games
          </span>
        </div>
        <SideColumn
          name={teamBName}
          games={gamesB}
          disabled={disabled || matchComplete}
          onIncrement={() => onPointB(1)}
          onDecrement={() => onPointB(-1)}
          canDecrement={gameState.currentPointsB > 0 && !matchComplete}
          align="right"
        />
      </div>

      <p className="text-center text-[11px] leading-relaxed text-cp-muted">
        Each + awards a rally point ({rules.pointStyle === "tennis" ? "0 → 15 → 30 → 40" : "points"}
        ). First to {rules.raceToGames} games wins the match
        {rules.gameDecider === "golden_point" ? " (golden point at deuce)" : " (advantage)"}.
      </p>
    </div>
  );
}

function SideColumn({
  name,
  games,
  disabled,
  onIncrement,
  onDecrement,
  canDecrement,
  align = "left",
}: {
  name: string;
  games: number;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  canDecrement: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", align === "right" && "items-end")}>
      <p
        className={cn(
          "max-w-full truncate text-xs font-semibold text-foreground sm:text-sm",
          align === "right" && "text-right",
        )}
        title={name}
      >
        {name}
      </p>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full border-cp-border"
          disabled={disabled || !canDecrement}
          onClick={onDecrement}
          aria-label={`Undo point for ${name}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[2.25rem] text-center text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
          {games}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full border-cp-border"
          disabled={disabled}
          onClick={onIncrement}
          aria-label={`Award point to ${name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Read-only games + rally display for history / public cards. */
export function GameRaceScoreBadge({
  gamesA,
  gamesB,
  currentPointsA,
  currentPointsB,
  pointStyle = "tennis",
  showRally = false,
  className,
}: {
  gamesA: number;
  gamesB: number;
  currentPointsA?: number;
  currentPointsB?: number;
  pointStyle?: "tennis" | "simple";
  showRally?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-0.5", className)}>
      <span className="rounded-full bg-cp-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-foreground">
        {gamesA}
        <span className="mx-1 font-normal text-cp-muted">–</span>
        {gamesB}
      </span>
      {showRally && currentPointsA != null && currentPointsB != null ? (
        <span className="text-[10px] tabular-nums text-cp-muted">
          {formatIntraGameScoreLine(currentPointsA, currentPointsB, pointStyle)}
        </span>
      ) : null}
    </div>
  );
}
