"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Trophy, ZoomIn, ZoomOut } from "lucide-react";
import {
  BracketConnectorOverlay,
  shouldRenderBracketMatch,
} from "@/components/tournaments/bracket-tree-connectors";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import {
  buildBracketMatchAnchors,
  buildLayoutBracketPaths,
  getBracketGridMetrics,
  getBracketMaxPlayersPerSide,
  getMainDrawGridSlots,
  getMainDrawMatches,
  getMainDrawRoundNumbers,
  getMainDrawTotalRounds,
  getPlayInMatches,
} from "@/lib/tournaments/brackets/tree-layout";
import { computeBracketFitScale } from "@/lib/tournaments/display/fit-capacity";
import { cn } from "@/lib/utils";
import { uniquePlayerNames } from "@/lib/format/player-names";

type BracketTreeViewProps = {
  matches: BracketMatchView[];
  emptyMessage?: string;
  highlightTeamIds?: string[];
  onSlotClick?: (matchId: string, slot: "a" | "b") => void;
  activeSeedSlot?: { matchId: string; slot: "a" | "b" } | null;
  seedingMode?: boolean;
  showEmptySlots?: boolean;
  /**
   * `display` — venue TV: auto-scale the tree to fill one monitor (no pan/zoom chrome).
   * `interactive` — public/manage: pan + zoom controls (default).
   */
  variant?: "interactive" | "display";
};

function matchStatusLabel(m: BracketMatchView): { label: string; className: string } {
  if (m.status === "completed") return { label: "Finished", className: "text-cp-primary" };
  if (m.status === "in_progress") return { label: "Live", className: "text-emerald-400" };
  if (m.status === "bye") return { label: "Walkover", className: "text-cp-muted" };
  return { label: "Upcoming", className: "text-cp-muted" };
}

function shortRoundTag(label: string): string {
  if (label === "Final") return "F";
  if (label === "Semifinal") return "SF";
  if (label === "Quarterfinal") return "QF";
  const of = label.match(/Round of (\d+)/i);
  if (of) return `R${of[1]}`;
  return label.replace(/^Round\s+/i, "R");
}

function shouldShowScore(m: BracketMatchView, score: number | null): boolean {
  if (score == null) return false;
  if (m.status === "in_progress" || m.status === "completed") return true;
  return score > 0;
}

export function BracketTreeView({
  matches,
  emptyMessage = "Bracket not generated yet.",
  highlightTeamIds = [],
  onSlotClick,
  activeSeedSlot = null,
  seedingMode = false,
  showEmptySlots = true,
  variant = "interactive",
}: BracketTreeViewProps) {
  const isDisplay = variant === "display";
  const structuralMatches = useMemo(
    () =>
      seedingMode || showEmptySlots ? matches : matches.filter(shouldRenderBracketMatch),
    [matches, seedingMode, showEmptySlots],
  );

  const playInMatches = useMemo(
    () => getPlayInMatches(structuralMatches),
    [structuralMatches],
  );
  const treeMatches = useMemo(
    () => getMainDrawMatches(structuralMatches),
    [structuralMatches],
  );

  const gridSlots = useMemo(() => getMainDrawGridSlots(structuralMatches), [structuralMatches]);
  const rosterSizing = useMemo(
    () => getBracketMaxPlayersPerSide(structuralMatches, 6),
    [structuralMatches],
  );
  const maxPlayersPerSide = rosterSizing.display;
  const metrics = useMemo(
    () =>
      getBracketGridMetrics(gridSlots, maxPlayersPerSide, {
        overflowRow: rosterSizing.needsOverflowRow,
      }),
    [gridSlots, maxPlayersPerSide, rosterSizing.needsOverflowRow],
  );
  const roundNumbers = useMemo(() => getMainDrawRoundNumbers(treeMatches), [treeMatches]);
  const totalRounds = useMemo(
    () => getMainDrawTotalRounds(structuralMatches),
    [structuralMatches],
  );

  const anchors = useMemo(
    () => buildBracketMatchAnchors(treeMatches, roundNumbers, metrics, 0),
    [treeMatches, roundNumbers, metrics],
  );
  const anchorsById = useMemo(() => new Map(anchors.map((a) => [a.id, a])), [anchors]);
  const connectorPaths = useMemo(() => buildLayoutBracketPaths(anchors), [anchors]);

  const treeWidth = useMemo(() => {
    if (!roundNumbers.length) return metrics.columnWidth;
    return (
      roundNumbers.length * metrics.columnWidth +
      Math.max(roundNumbers.length - 1, 0) * metrics.gutterWidth +
      48
    );
  }, [roundNumbers.length, metrics.columnWidth, metrics.gutterWidth]);

  const treeHeight = metrics.headerHeight + metrics.columnHeight + 56;

  const matchesByRound = useMemo(() => {
    const map = new Map<number, BracketMatchView[]>();
    for (const m of treeMatches) {
      const list = map.get(m.roundNumber) ?? [];
      list.push(m);
      map.set(m.roundNumber, list);
    }
    for (const [round, list] of map) {
      map.set(
        round,
        list.sort((a, b) => a.matchNumber - b.matchNumber),
      );
    }
    return map;
  }, [treeMatches]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  /** True only for the pan gesture that just ended — cleared after click handlers run. */
  const suppressClickFromPanRef = useRef(false);
  const pointerOrigin = useRef({ x: 0, y: 0 });

  const interactiveZoom = Math.max(0.5, Math.min(zoom, 1.5));
  const effectiveZoom = isDisplay ? fitScale : interactiveZoom;
  const firstMainRound = roundNumbers[0] ?? 1;

  useEffect(() => {
    if (!isDisplay) return;
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const next = computeBracketFitScale(
        el.clientWidth,
        el.clientHeight,
        treeWidth,
        treeHeight,
      );
      setFitScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDisplay, treeWidth, treeHeight]);

  const isInteractivePanTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        "[data-bracket-slot], [data-bracket-chrome], button, a, input, select, textarea, label",
      ),
    );
  };

  const endPan = () => {
    setIsPanning(false);
  };

  const handleSlotClick = (matchId: string, slot: "a" | "b") => {
    if (suppressClickFromPanRef.current) return;
    onSlotClick?.(matchId, slot);
  };

  if (!matches.length) {
    return (
      <div className="rounded-2xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn(isDisplay ? "flex h-full min-h-0 flex-col gap-3" : "space-y-4")}>
      {playInMatches.length > 0 ? (
        <section
          className={cn(
            "rounded-xl border border-cp-border/70 bg-cp-elevated/20 p-3 sm:p-4",
            isDisplay && "max-h-[28%] shrink-0 overflow-y-auto",
          )}
        >
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cp-primary">
                Play-in
              </p>
              <p className="mt-0.5 text-xs text-cp-muted">
                Winners advance into the main draw below.
              </p>
            </div>
            <p className="text-[11px] text-cp-muted">{playInMatches.length} matches</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {playInMatches.map((m) => {
              const status = matchStatusLabel(m);
              return (
                <article
                  key={m.id}
                  className={cn(
                    "rounded-lg border bg-cp-card shadow-sm",
                    m.status === "in_progress"
                      ? "border-emerald-500/45"
                      : m.status === "completed"
                        ? "border-cp-primary/30"
                        : "border-cp-border/80",
                  )}
                >
                  <div className="flex items-center justify-between border-b border-cp-border/50 px-2.5 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                      Play-in · M{m.matchNumber}
                    </span>
                    <span className={cn("text-[10px] font-bold uppercase", status.className)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-col divide-y divide-cp-border/50">
                    <MatchSlot
                      name={m.teamAName}
                      players={m.teamAPlayers}
                      score={shouldShowScore(m, m.scoreA) ? m.scoreA : null}
                      winner={m.winnerTeamId != null && m.winnerTeamId === m.teamAId}
                      eliminated={
                        m.status === "completed" &&
                        m.winnerTeamId != null &&
                        m.winnerTeamId !== m.teamAId
                      }
                      highlighted={Boolean(m.teamAId && highlightTeamIds.includes(m.teamAId))}
                      active={
                        activeSeedSlot?.matchId === m.id && activeSeedSlot.slot === "a"
                      }
                      droppable={seedingMode && m.status === "pending"}
                      showEmptySlots={showEmptySlots}
                      compact
                      maxPlayers={maxPlayersPerSide}
                      onPrepareClick={() => {
                        suppressClickFromPanRef.current = false;
                      }}
                      onClick={
                        onSlotClick && seedingMode && m.status === "pending"
                          ? () => handleSlotClick(m.id, "a")
                          : undefined
                      }
                    />
                    <MatchSlot
                      name={m.teamBName}
                      players={m.teamBPlayers}
                      score={shouldShowScore(m, m.scoreB) ? m.scoreB : null}
                      winner={m.winnerTeamId != null && m.winnerTeamId === m.teamBId}
                      eliminated={
                        m.status === "completed" &&
                        m.winnerTeamId != null &&
                        m.winnerTeamId !== m.teamBId
                      }
                      highlighted={Boolean(m.teamBId && highlightTeamIds.includes(m.teamBId))}
                      active={
                        activeSeedSlot?.matchId === m.id && activeSeedSlot.slot === "b"
                      }
                      droppable={seedingMode && m.status === "pending"}
                      showEmptySlots={showEmptySlots}
                      compact
                      maxPlayers={maxPlayersPerSide}
                      onPrepareClick={() => {
                        suppressClickFromPanRef.current = false;
                      }}
                      onClick={
                        onSlotClick && seedingMode && m.status === "pending"
                          ? () => handleSlotClick(m.id, "b")
                          : undefined
                      }
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!isDisplay ? (
        <div className="flex flex-wrap items-center justify-between gap-2" data-bracket-chrome="">
          <p className="text-[11px] text-cp-muted">Drag to pan · use zoom for detail</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cp-border bg-cp-card text-cp-muted hover:text-foreground"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="h-8 min-w-[3.5rem] rounded-lg border border-cp-border bg-cp-card px-2 text-[11px] font-semibold tabular-nums text-cp-muted hover:text-foreground"
              title="Reset to 100%"
              onClick={() => setZoom(1)}
            >
              {Math.round(effectiveZoom * 100)}%
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cp-border bg-cp-card text-cp-muted hover:text-foreground"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={cn(
          "rounded-xl border border-cp-border/60 bg-gradient-to-b from-cp-elevated/15 to-transparent",
          isDisplay
            ? "relative min-h-0 flex-1 overflow-hidden"
            : cn(
                "max-h-[min(85vh,56rem)] min-h-[16rem] overflow-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
                isPanning ? "cursor-grabbing select-none" : "cursor-grab",
              ),
        )}
        onPointerDown={
          isDisplay
            ? undefined
            : (e) => {
                if (e.button !== 0) return;
                if (isInteractivePanTarget(e.target)) return;
                const el = viewportRef.current;
                if (!el) return;
                suppressClickFromPanRef.current = false;
                pointerOrigin.current = { x: e.clientX, y: e.clientY };
                setIsPanning(true);
                panStart.current = {
                  x: e.clientX,
                  y: e.clientY,
                  scrollLeft: el.scrollLeft,
                  scrollTop: el.scrollTop,
                };
                el.setPointerCapture(e.pointerId);
              }
        }
        onPointerMove={
          isDisplay
            ? undefined
            : (e) => {
                const el = viewportRef.current;
                if (!el || !isPanning) return;
                if (
                  Math.abs(e.clientX - pointerOrigin.current.x) > 6 ||
                  Math.abs(e.clientY - pointerOrigin.current.y) > 6
                ) {
                  suppressClickFromPanRef.current = true;
                }
                el.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x);
                el.scrollTop = panStart.current.scrollTop - (e.clientY - panStart.current.y);
              }
        }
        onPointerUp={isDisplay ? undefined : endPan}
        onPointerCancel={isDisplay ? undefined : endPan}
      >
        <div
          className={cn(
            isDisplay
              ? "absolute inset-0 overflow-hidden"
              : "p-3 pb-12 sm:p-4 sm:pb-14",
          )}
          style={
            isDisplay
              ? undefined
              : {
                  width: treeWidth * effectiveZoom + 32,
                  minHeight: treeHeight * effectiveZoom + 48,
                }
          }
        >
          <div
            className="relative"
            style={
              isDisplay
                ? {
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: treeWidth,
                    height: treeHeight,
                    transform: `translate(-50%, -50%) scale(${effectiveZoom})`,
                    transformOrigin: "center center",
                  }
                : {
                    width: treeWidth,
                    height: treeHeight,
                    transform: `scale(${effectiveZoom})`,
                    transformOrigin: "top left",
                  }
            }
          >
            <BracketConnectorOverlay
              paths={connectorPaths}
              width={treeWidth}
              height={treeHeight}
            />

            {roundNumbers.map((round, columnIndex) => {
              const left = columnIndex * (metrics.columnWidth + metrics.gutterWidth);
              const label = getBracketRoundLabel(round, totalRounds);
              const tag = shortRoundTag(label);
              const isFinal = round === totalRounds;
              const roundMatches = matchesByRound.get(round) ?? [];

              return (
                <div
                  key={round}
                  className="absolute top-0"
                  style={{ left, width: metrics.columnWidth }}
                >
                  <p
                    className="truncate text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-cp-muted sm:text-[11px]"
                    style={{
                      height: metrics.headerHeight,
                      lineHeight: `${metrics.headerHeight}px`,
                    }}
                  >
                    {label}
                  </p>

                  {roundMatches.map((m) => {
                    const anchor = anchorsById.get(m.id);
                    if (!anchor) return null;
                    const status = matchStatusLabel(m);
                    const seedable =
                      seedingMode &&
                      m.roundNumber === firstMainRound &&
                      m.status === "pending";

                    return (
                      <article
                        key={m.id}
                        className={cn(
                          "absolute z-[1] flex flex-col overflow-hidden rounded-lg border bg-cp-card shadow-sm",
                          m.status === "completed"
                            ? "border-cp-primary/35"
                            : m.status === "in_progress"
                              ? "border-emerald-500/45 ring-1 ring-emerald-500/20"
                              : "border-cp-border/80",
                        )}
                        style={{
                          top: anchor.centerY - metrics.rowHeight / 2,
                          left: 0,
                          width: metrics.columnWidth,
                          height: metrics.rowHeight - 4,
                        }}
                      >
                        <div
                          className="flex shrink-0 items-center justify-between gap-2 border-b border-cp-border/50 bg-cp-elevated/25 px-2.5"
                          style={{ height: metrics.headerHeight }}
                        >
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-cp-muted">
                            {tag} · M{m.matchNumber}
                          </span>
                          <span className={cn("text-[9px] font-bold uppercase", status.className)}>
                            {status.label}
                          </span>
                        </div>
                        <div className="grid min-h-0 flex-1 grid-rows-2 divide-y divide-cp-border/50">
                          <MatchSlot
                            name={m.teamAName}
                            players={m.teamAPlayers}
                            score={shouldShowScore(m, m.scoreA) ? m.scoreA : null}
                            winner={m.winnerTeamId != null && m.winnerTeamId === m.teamAId}
                            eliminated={
                              m.status === "completed" &&
                              m.winnerTeamId != null &&
                              m.winnerTeamId !== m.teamAId
                            }
                            highlighted={Boolean(
                              m.teamAId && highlightTeamIds.includes(m.teamAId),
                            )}
                            active={
                              activeSeedSlot?.matchId === m.id && activeSeedSlot.slot === "a"
                            }
                            droppable={seedable}
                            showEmptySlots={showEmptySlots}
                            compact={metrics.compactPlayers}
                            maxPlayers={metrics.maxPlayersPerSide}
                            onPrepareClick={() => {
                              suppressClickFromPanRef.current = false;
                            }}
                            onClick={
                              onSlotClick && seedable
                                ? () => handleSlotClick(m.id, "a")
                                : undefined
                            }
                          />
                          <MatchSlot
                            name={m.teamBName}
                            players={m.teamBPlayers}
                            score={shouldShowScore(m, m.scoreB) ? m.scoreB : null}
                            winner={m.winnerTeamId != null && m.winnerTeamId === m.teamBId}
                            eliminated={
                              m.status === "completed" &&
                              m.winnerTeamId != null &&
                              m.winnerTeamId !== m.teamBId
                            }
                            highlighted={Boolean(
                              m.teamBId && highlightTeamIds.includes(m.teamBId),
                            )}
                            active={
                              activeSeedSlot?.matchId === m.id && activeSeedSlot.slot === "b"
                            }
                            droppable={seedable}
                            showEmptySlots={showEmptySlots}
                            compact={metrics.compactPlayers}
                            maxPlayers={metrics.maxPlayersPerSide}
                            onPrepareClick={() => {
                              suppressClickFromPanRef.current = false;
                            }}
                            onClick={
                              onSlotClick && seedable
                                ? () => handleSlotClick(m.id, "b")
                                : undefined
                            }
                          />
                        </div>
                      </article>
                    );
                  })}

                  {isFinal ? (
                    <div
                      className="pointer-events-none absolute flex items-center justify-center"
                      style={{
                        left: metrics.columnWidth + 6,
                        top: metrics.headerHeight + metrics.columnHeight / 2 - 16,
                      }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cp-primary/30 bg-cp-primary/10">
                        <Trophy className="h-3.5 w-3.5 text-cp-primary/80" />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchSlot({
  name,
  players,
  score,
  winner = false,
  eliminated = false,
  highlighted = false,
  active = false,
  droppable = false,
  showEmptySlots = false,
  compact = false,
  maxPlayers = 4,
  onPrepareClick,
  onClick,
}: {
  name: string | null;
  players?: string[];
  score: number | null;
  winner?: boolean;
  eliminated?: boolean;
  highlighted?: boolean;
  active?: boolean;
  droppable?: boolean;
  showEmptySlots?: boolean;
  compact?: boolean;
  /** Visible roster rows before “+N more” (supports 2–6 for doubles / squads). */
  maxPlayers?: number;
  /** Clear pan-suppress flag before this slot's click (pointerdown). */
  onPrepareClick?: () => void;
  onClick?: () => void;
}) {
  const hasPlayers = Boolean(players?.some((p) => p.trim()));
  const hasTeam = Boolean(name?.trim());
  const isEmpty = !hasTeam && !hasPlayers;
  const isByeLabel = hasTeam && name!.trim().toUpperCase() === "BYE";
  const rosterCap = Math.max(1, Math.min(maxPlayers, 6));
  const resolvedPlayers = hasPlayers ? uniquePlayerNames(players ?? []) : [];

  if (isEmpty && !droppable && !showEmptySlots) {
    return <div className="h-full min-h-10" aria-hidden />;
  }

  const teamLabel = hasTeam
    ? isByeLabel
      ? "No opponent"
      : name
    : droppable
      ? "Drop squad"
      : "TBD";

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "flex min-w-0 items-center gap-1 truncate font-semibold leading-tight",
            compact ? "text-[11px]" : "text-sm",
            winner && "text-emerald-500 dark:text-emerald-300",
            eliminated && "text-cp-muted line-through decoration-cp-muted/60",
            !winner && !eliminated && !isByeLabel && "text-foreground",
            ((droppable && !hasTeam) || isByeLabel) && "text-cp-muted",
          )}
          title={teamLabel ?? undefined}
        >
          {winner ? (
            <Crown
              className="h-3.5 w-3.5 shrink-0 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]"
              aria-hidden
            />
          ) : null}
          <span className="truncate">{teamLabel}</span>
        </span>
        {resolvedPlayers.length > 0 && !isByeLabel ? (
          <TeamPlayerList
            names={resolvedPlayers}
            maxNames={rosterCap}
            compact={compact}
            className="mt-0.5 space-y-0.5"
          />
        ) : hasTeam && !isByeLabel && !droppable ? (
          <span
            className={cn(
              "mt-0.5 block truncate leading-tight text-cp-muted/70",
              compact ? "text-[9px]" : "text-[11px]",
            )}
          >
            Players TBD
          </span>
        ) : null}
      </div>
      {score != null && !isByeLabel ? (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 self-start pt-0.5 font-mono font-semibold tabular-nums",
            compact ? "text-xs" : "text-sm",
            winner ? "text-emerald-400" : "text-foreground",
          )}
        >
          {winner ? (
            <Crown
              className="h-3 w-3 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]"
              aria-hidden
            />
          ) : null}
          {score}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "flex h-full w-full items-start justify-between gap-2 overflow-hidden px-2.5 text-left transition-colors",
    compact ? "py-1.5" : "py-2",
    highlighted && "bg-emerald-500/10",
    droppable && "cursor-pointer hover:bg-cp-primary/5",
    active && "bg-cp-primary/10 ring-2 ring-inset ring-cp-primary/50",
    eliminated && "opacity-60",
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-bracket-slot=""
        className={className}
        title={droppable ? "Click to select this slot for swap / place" : undefined}
        onPointerDown={(e) => {
          // Never start canvas pan from a slot; always allow this click.
          e.stopPropagation();
          onPrepareClick?.();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
