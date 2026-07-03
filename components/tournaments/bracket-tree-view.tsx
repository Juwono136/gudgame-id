"use client";

import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import {
  BracketConnectorOverlay,
  buildMeasuredBracketPaths,
  shouldRenderBracketMatch,
} from "@/components/tournaments/bracket-tree-connectors";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import { cn } from "@/lib/utils";

const MATCH_ROW_GAP_BASE = 20;
const CONNECTOR_GUTTER = 40;

function getBracketGridLayout(firstRoundCount: number) {
  const gridSlots = Math.max(firstRoundCount, 1);
  const rowGap =
    gridSlots >= 16 ? 32 : gridSlots >= 8 ? 28 : gridSlots >= 4 ? 24 : MATCH_ROW_GAP_BASE;
  const rowHeight =
    gridSlots >= 16 ? 108 : gridSlots >= 8 ? 112 : gridSlots >= 4 ? 116 : 120;
  const columnHeight = gridSlots * rowHeight + Math.max(gridSlots - 1, 0) * rowGap;
  return { gridSlots, rowHeight, rowGap, columnHeight };
}

function matchGridStyle(roundNumber: number, matchIndex: number): CSSProperties {
  const span = 2 ** (roundNumber - 1);
  const rowStart = matchIndex * span + 1;
  return {
    gridRow: `${rowStart} / span ${span}`,
    alignSelf: "center",
    width: "100%",
  };
}

type BracketTreeViewProps = {
  matches: BracketMatchView[];
  emptyMessage?: string;
  highlightTeamIds?: string[];
  onSlotClick?: (matchId: string, slot: "a" | "b") => void;
  /** Highlights the round-one slot currently selected for manual seeding. */
  activeSeedSlot?: { matchId: string; slot: "a" | "b" } | null;
  seedingMode?: boolean;
  /** Public bracket: show empty pending slots as TBD instead of hiding them. */
  showEmptySlots?: boolean;
};

function matchStatusLabel(m: BracketMatchView): { label: string; className: string } {
  if (m.status === "completed") {
    return { label: "Finished", className: "text-cp-primary" };
  }
  if (m.status === "in_progress") {
    return { label: "Live", className: "text-emerald-400" };
  }
  if (m.status === "bye") {
    return { label: "Walkover", className: "text-cp-muted" };
  }
  return { label: "Upcoming", className: "text-cp-muted" };
}

export function BracketTreeView({
  matches,
  emptyMessage = "Bracket not generated yet.",
  highlightTeamIds = [],
  onSlotClick,
  activeSeedSlot = null,
  seedingMode = false,
  showEmptySlots = false,
}: BracketTreeViewProps) {
  const visibleMatches = useMemo(
    () =>
      seedingMode || showEmptySlots ? matches : matches.filter(shouldRenderBracketMatch),
    [matches, seedingMode, showEmptySlots],
  );

  const { roundNumbers, totalRounds, gridSlots, rowHeight, rowGap, columnHeight } = useMemo(() => {
    const nums = [...new Set(visibleMatches.map((m) => m.roundNumber))].sort((a, b) => a - b);
    const max = nums.length ? Math.max(...nums) : 0;
    const firstRoundCount = visibleMatches.filter((m) => m.roundNumber === nums[0]).length;
    const layout = getBracketGridLayout(firstRoundCount);
    return {
      roundNumbers: nums,
      totalRounds: max,
      ...layout,
    };
  }, [visibleMatches]);

  const rounds = useMemo(() => {
    const map = new Map<number, BracketMatchView[]>();
    for (const m of visibleMatches) {
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
  }, [visibleMatches]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const matchElements = useRef(new Map<string, HTMLDivElement>());
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, scrollLeft: 0 });
  const draggedRef = useRef(false);
  const pointerOrigin = useRef({ x: 0, y: 0 });

  const registerMatchRef = useCallback((matchId: string) => {
    return (node: HTMLDivElement | null) => {
      if (node) {
        matchElements.current.set(matchId, node);
      } else {
        matchElements.current.delete(matchId);
      }
    };
  }, []);

  const connectorPairs = useMemo(() => {
    const pairs: Array<{ nextId: string; feederIds: string[] }> = [];

    for (let ri = 0; ri < roundNumbers.length - 1; ri++) {
      const curRound = roundNumbers[ri]!;
      const nextRound = roundNumbers[ri + 1]!;
      const curMatches = rounds.get(curRound) ?? [];
      const nextMatches = rounds.get(nextRound) ?? [];

      for (const nextM of nextMatches) {
        let feeders = curMatches.filter((m) => m.nextMatchId === nextM.id);
        if (!feeders.length) {
          const slot = nextM.matchNumber - 1;
          feeders = curMatches.filter(
            (m) => m.matchNumber === slot * 2 + 1 || m.matchNumber === slot * 2 + 2,
          );
        }
        if (feeders.length) {
          pairs.push({ nextId: nextM.id, feederIds: feeders.map((f) => f.id) });
        }
      }
    }

    return pairs;
  }, [roundNumbers, rounds]);

  const measureConnectors = useCallback(() => {
    const tree = treeRef.current;
    if (!tree) return;

    const treeRect = tree.getBoundingClientRect();
    setOverlaySize({ width: tree.offsetWidth, height: tree.offsetHeight });

    const positions = new Map<string, DOMRect>();
    for (const [id, el] of matchElements.current) {
      if (!tree.contains(el)) continue;
      positions.set(id, el.getBoundingClientRect());
    }

    const paths: string[] = [];
    for (const { nextId, feederIds } of connectorPairs) {
      const nextRect = positions.get(nextId);
      if (!nextRect) continue;

      const target = {
        x: nextRect.left - treeRect.left,
        y: nextRect.top - treeRect.top + nextRect.height / 2,
      };

      const feeders = feederIds
        .map((id) => positions.get(id))
        .filter((rect): rect is DOMRect => Boolean(rect))
        .map((rect) => ({
          x: rect.right - treeRect.left,
          y: rect.top - treeRect.top + rect.height / 2,
        }));

      const pathSegments = buildMeasuredBracketPaths(feeders, target);
      paths.push(...pathSegments);
    }

    setConnectorPaths(paths);
  }, [connectorPairs]);

  useLayoutEffect(() => {
    measureConnectors();
    const tree = treeRef.current;
    if (!tree) return;

    const observer = new ResizeObserver(() => {
      measureConnectors();
    });
    observer.observe(tree);
    for (const el of matchElements.current.values()) {
      observer.observe(el);
    }

    const onResize = () => measureConnectors();
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [measureConnectors, visibleMatches, roundNumbers, columnHeight]);

  if (!matches.length) {
    return (
      <div className="rounded-2xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
        {emptyMessage}
      </div>
    );
  }

  const isInteractivePanTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("[data-bracket-slot], button, a, input, select, textarea, label"));
  };

  const onPanStart = (clientX: number, clientY: number) => {
    const el = scrollRef.current;
    if (!el) return;
    draggedRef.current = false;
    pointerOrigin.current = { x: clientX, y: clientY };
    setIsPanning(true);
    panStart.current = { x: clientX, scrollLeft: el.scrollLeft };
  };

  const onPanMove = (clientX: number, clientY: number) => {
    const el = scrollRef.current;
    if (!el || !isPanning) return;
    const dx = clientX - pointerOrigin.current.x;
    const dy = clientY - pointerOrigin.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      draggedRef.current = true;
    }
    el.scrollLeft = panStart.current.scrollLeft - (clientX - panStart.current.x);
  };

  const endPan = () => setIsPanning(false);

  const handleSlotClick = (matchId: string, slot: "a" | "b") => {
    if (draggedRef.current) return;
    onSlotClick?.(matchId, slot);
  };

  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] text-cp-muted sm:text-[11px]">
        {seedingMode
          ? "Click a round-one slot to place a team. Drag horizontally to explore the tree."
          : "Drag horizontally to explore the tree. Scores update as matches finish."}
      </p>
      <div
        ref={scrollRef}
        className={cn(
          "overflow-x-auto overflow-y-auto rounded-xl border border-cp-border/60 bg-gradient-to-b from-cp-elevated/20 to-cp-elevated/5 pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
          isPanning ? "cursor-grabbing select-none" : "cursor-grab",
        )}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if (isInteractivePanTarget(e.target)) return;
          onPanStart(e.clientX, e.clientY);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => onPanMove(e.clientX, e.clientY)}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onPointerCancel={endPan}
      >
        <div
          ref={treeRef}
          className="relative min-w-max px-2 py-3 sm:px-4"
        >
          <BracketConnectorOverlay
            paths={connectorPaths}
            width={overlaySize.width}
            height={overlaySize.height}
          />

          <div className="relative z-10 flex items-stretch">
            {roundNumbers.map((round, roundIndex) => {
              const roundMatches = rounds.get(round) ?? [];
              const label = getBracketRoundLabel(round, totalRounds);
              const isFinalRound = round === totalRounds;

              return (
                <Fragment key={round}>
                  {roundIndex > 0 ? (
                    <div
                      className="shrink-0"
                      style={{ width: CONNECTOR_GUTTER }}
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex shrink-0 items-stretch">
                  <div className="flex w-[15.5rem] shrink-0 flex-col sm:w-[17rem] md:w-60 lg:w-64">
                    <p className="mb-2 shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-cp-muted sm:mb-3 sm:text-[11px]">
                      {label}
                    </p>
                    <div
                      className="grid"
                      style={{
                        minHeight: columnHeight,
                        rowGap: rowGap,
                        gridTemplateRows: `repeat(${gridSlots}, ${rowHeight}px)`,
                      }}
                    >
                      {roundMatches.map((m, i) => {
                        const status = matchStatusLabel(m);
                        const slotIndex = m.matchNumber - 1;
                        return (
                          <motion.div
                            key={m.id}
                            ref={registerMatchRef(m.id)}
                            style={matchGridStyle(round, slotIndex)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: roundIndex * 0.04 + i * 0.03 }}
                            onAnimationComplete={measureConnectors}
                            className={cn(
                              "relative overflow-hidden rounded-xl border bg-cp-card shadow-sm",
                              m.status === "completed"
                                ? "border-cp-primary/35"
                                : m.status === "in_progress"
                                  ? "border-emerald-500/45 ring-1 ring-emerald-500/20"
                                  : m.status === "bye"
                                    ? "border-cp-border/70"
                                    : "border-cp-border/80",
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b border-cp-border/60 bg-cp-elevated/30 px-3 py-1.5">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-cp-muted">
                                M{m.matchNumber}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-semibold uppercase",
                                  status.className,
                                )}
                              >
                                {status.label}
                              </span>
                            </div>
                            <div className="divide-y divide-cp-border/60">
                              <MatchSlot
                                name={m.teamAName}
                                players={m.teamAPlayers}
                                score={m.scoreA}
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
                                droppable={
                                  seedingMode && m.roundNumber === 1 && m.status === "pending"
                                }
                                showEmptySlots={showEmptySlots}
                                onClick={
                                  onSlotClick && m.roundNumber === 1 && m.status === "pending"
                                    ? () => handleSlotClick(m.id, "a")
                                    : undefined
                                }
                              />
                              <MatchSlot
                                name={m.teamBName}
                                players={m.teamBPlayers}
                                score={m.scoreB}
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
                                droppable={
                                  seedingMode && m.roundNumber === 1 && m.status === "pending"
                                }
                                showEmptySlots={showEmptySlots}
                                onClick={
                                  onSlotClick && m.roundNumber === 1 && m.status === "pending"
                                    ? () => handleSlotClick(m.id, "b")
                                    : undefined
                                }
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {isFinalRound ? (
                    <div className="ml-1 flex shrink-0 items-center self-center sm:ml-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cp-primary/30 bg-cp-primary/10 shadow-[0_0_20px_rgba(0,71,255,0.12)] sm:h-12 sm:w-12 lg:h-14 lg:w-14">
                        <Trophy className="h-5 w-5 text-cp-primary/80 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                      </div>
                    </div>
                  ) : null}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPlayers(players?: string[]): string | null {
  if (!players?.length) return null;
  return players.join(" / ");
}

function MatchSlot({
  name,
  players,
  score,
  winner,
  eliminated,
  highlighted,
  active = false,
  droppable,
  showEmptySlots = false,
  onClick,
}: {
  name: string | null;
  players?: string[];
  score: number | null;
  winner: boolean;
  eliminated: boolean;
  highlighted?: boolean;
  active?: boolean;
  droppable?: boolean;
  showEmptySlots?: boolean;
  onClick?: () => void;
}) {
  const playerLine = formatPlayers(players);
  const hasTeam = Boolean(name?.trim());
  const hasPlayers = Boolean(playerLine);
  const isEmpty = !hasTeam && !hasPlayers;
  const isByeLabel = hasTeam && name!.trim().toUpperCase() === "BYE";

  if (isEmpty && !droppable && !showEmptySlots) {
    return (
      <div
        className={cn("min-h-[44px] px-3 py-2.5", highlighted && "bg-emerald-500/10")}
        aria-hidden
      />
    );
  }

  const teamLabel = hasTeam
    ? isByeLabel
      ? "No opponent"
      : name
    : droppable
      ? "Drop squad here"
      : "TBD";

  const showScore = score != null && !isByeLabel;

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-semibold leading-snug",
            winner && "text-emerald-500 dark:text-emerald-300",
            eliminated && "text-cp-muted line-through decoration-cp-muted/60",
            !winner && !eliminated && !isByeLabel && "text-foreground",
            (droppable && !hasTeam) || isByeLabel ? "text-cp-muted" : "",
          )}
        >
          {teamLabel}
        </span>
        {hasPlayers && !isByeLabel ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-cp-muted">{playerLine}</span>
        ) : null}
      </div>
      {showScore ? (
        <span
          className={cn(
            "shrink-0 font-mono text-sm font-semibold tabular-nums",
            winner ? "text-emerald-400" : "text-foreground",
          )}
        >
          {score}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "flex min-h-[48px] items-center justify-between gap-3 px-3 py-2.5 transition-colors sm:min-h-[44px]",
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
        className={cn(className, "w-full text-left")}
        onPointerDown={(e) => e.stopPropagation()}
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
