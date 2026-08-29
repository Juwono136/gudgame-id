"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Columns3,
  ListOrdered,
  Plus,
  Rows3,
  Search,
  Shuffle,
} from "lucide-react";
import { FunMatchRoundMatchCard } from "@/components/tournaments/fun-match/fun-match-round-match-card";
import { RestTeamsPanel } from "@/components/tournaments/fun-match/rest-teams-panel";
import {
  MatchRoundTabs,
  type MatchRoundTabItem,
} from "@/components/tournaments/fun-match/match-round-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatGroupStageRoundTabLabel,
  formatGroupStageRoundTitle,
} from "@/lib/tournaments/double-stage/round-number";
import type { FunMatchRoundGroup } from "@/lib/tournaments/reclub/round-groups";
import { getPreferredLiveScoringRound } from "@/lib/tournaments/reclub/round-groups";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { AmericanoPlayerRef } from "@/lib/tournaments/americano/court-assignments";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { getReclubMatchHistoryKey } from "@/lib/tournaments/reclub/types";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import type { StartableGroupFixture } from "@/lib/tournaments/double-stage/view-mappers";
import type { ScoringRules } from "@/lib/tournaments/scoring/engine";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import { cn } from "@/lib/utils";

type CourtView = { id: string; name: string; courtNumber: number };

type FunMatchRoundsPanelProps = {
  roundGroups: FunMatchRoundGroup[];
  currentRound: number;
  courts: CourtView[];
  teams: LobbyTeamView[];
  matchByCourt: Map<string, ReclubMatchView>;
  teamAByCourt: Record<string, string>;
  teamBByCourt: Record<string, string>;
  bracketPickByCourt?: Record<string, string>;
  startableBracketMatches?: BracketMatchView[];
  /** Pending knockout fixtures only — idle court picker (excludes completed rematch). */
  idleBracketPickerMatches?: BracketMatchView[];
  startableGroupMatches?: StartableGroupFixture[];
  activeGroupMatches?: GroupMatchView[];
  isBracketMode?: boolean;
  isGroupStageMode?: boolean;
  groupPickByCourt?: Record<string, string>;
  onGroupPickChange?: (courtId: string, matchId: string) => void;
  onTeamAChange: (courtId: string, v: string) => void;
  onTeamBChange: (courtId: string, v: string) => void;
  onBracketPickChange?: (courtId: string, matchId: string) => void;
  onStartCourt: (courtId: string) => void;
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
  onEditCourtName: (courtId: string, currentName: string) => void;
  canManage?: boolean;
  readOnly?: boolean;
  pointsPerMatch: number;
  scoringRules?: ScoringRules;
  gameRules?: import("@/lib/tournaments/scoring/game-mode").MatchGameRules | null;
  classicSetRules?: import("@/lib/tournaments/scoring/classic-sets").ClassicSetRules | null;
  scoreEntryMode?: "live" | "paper";
  sportSlug?: string;
  tournamentSlug?: string;
  onOverrideSuccess?: () => void;
  isCourtStarting?: (courtId: string) => boolean;
  startingAll?: boolean;
  maxRounds?: number | null;
  onReshuffle?: () => void;
  onStartAllCourts?: () => void;
  onFinishRound?: () => void;
  hasActiveMatches?: boolean;
  accentVariant?: "fun" | "official";
  isAmericanoMode?: boolean;
  americanoPlayers?: AmericanoPlayerRef[];
  onManageAmericanoPairings?: (courtId: string) => void;
  /** Open fullscreen courtside scorepad for a court. */
  onOpenCourtside?: (courtId: string) => void;
  /** Prefocus a court (e.g. from ?court= deep link). */
  initialFocusedCourtId?: string | null;
  /** Hide idle planning when tournament is finished or not live. */
  scoringFrozen?: boolean;
  /**
   * When true (formats with Match Schedule tab), hide Idle courts · start next —
   * hosts start fixtures from Match Schedule by picking a court + Start.
   */
  startFixturesFromSchedule?: boolean;
  /** Per-match game rules (Custom knockout raceToByRound). */
  resolveGameRules?: (
    match: ReclubMatchView,
  ) => import("@/lib/tournaments/scoring/game-mode").MatchGameRules | null;
};

function matchMatchesSearch(m: ReclubMatchView, q: string): boolean {
  return (
    m.teamAName?.toLowerCase().includes(q) ||
    m.teamBName?.toLowerCase().includes(q) ||
    m.teamAPlayers.some((p) => p.toLowerCase().includes(q)) ||
    m.teamBPlayers.some((p) => p.toLowerCase().includes(q)) ||
    false
  );
}

function restingTeamNames(
  teams: LobbyTeamView[],
  roundMatches: ReclubMatchView[],
): string[] {
  const busy = new Set<string>();
  for (const m of roundMatches) {
    if (m.teamAId) busy.add(m.teamAId);
    if (m.teamBId) busy.add(m.teamBId);
  }
  return teams
    .filter((t) => t.memberCount > 0 && !busy.has(t.id))
    .map((t) => t.name);
}

export function FunMatchRoundsPanel({
  roundGroups,
  currentRound,
  courts,
  teams,
  matchByCourt,
  teamAByCourt,
  teamBByCourt,
  bracketPickByCourt = {},
  startableBracketMatches = [],
  idleBracketPickerMatches = [],
  startableGroupMatches = [],
  activeGroupMatches = [],
  isBracketMode = false,
  isGroupStageMode = false,
  groupPickByCourt = {},
  onGroupPickChange,
  onTeamAChange,
  onTeamBChange,
  onBracketPickChange,
  onStartCourt,
  onScoreChange,
  onCompleteMatch,
  onEditCourtName,
  canManage,
  readOnly,
  pointsPerMatch,
  scoringRules,
  gameRules = null,
  classicSetRules = null,
  scoreEntryMode = "live",
  sportSlug,
  tournamentSlug,
  onOverrideSuccess,
  isCourtStarting,
  startingAll,
  maxRounds,
  onReshuffle,
  onStartAllCourts,
  onFinishRound,
  hasActiveMatches,
  accentVariant = "fun",
  isAmericanoMode = false,
  americanoPlayers = [],
  onManageAmericanoPairings,
  onOpenCourtside,
  initialFocusedCourtId = null,
  scoringFrozen = false,
  startFixturesFromSchedule = false,
  resolveGameRules,
}: FunMatchRoundsPanelProps) {
  const accentLabel = accentVariant === "official" ? "text-cp-primary" : "text-emerald-400";
  const [search, setSearch] = useState("");
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(() => new Set());
  const [focusedCourtId, setFocusedCourtId] = useState<string | null>(initialFocusedCourtId);
  const [roundsLayout, setRoundsLayout] = useState<"tabs" | "stack">("tabs");
  /** When courts are live, idle planning stays collapsed unless host expands it. */
  const [idleExpandedWhileLive, setIdleExpandedWhileLive] = useState(false);

  useEffect(() => {
    if (initialFocusedCourtId) setFocusedCourtId(initialFocusedCourtId);
  }, [initialFocusedCourtId]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("gg-live-rounds-layout");
      if (stored === "stack" || stored === "tabs") setRoundsLayout(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setLayout = (next: "tabs" | "stack") => {
    setRoundsLayout(next);
    try {
      window.localStorage.setItem("gg-live-rounds-layout", next);
    } catch {
      /* ignore */
    }
  };

  const toggleExpandedMatch = (id: string) => {
    setExpandedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sessionRoundGroups = useMemo(
    () => roundGroups.filter((g) => g.roundNumber < 9000),
    [roundGroups],
  );

  const allSessionMatches = useMemo(
    () => sessionRoundGroups.flatMap((g) => g.matches),
    [sessionRoundGroups],
  );

  const activeRound = useMemo(
    () => getPreferredLiveScoringRound(allSessionMatches, currentRound),
    [allSessionMatches, currentRound],
  );

  const tabItems: MatchRoundTabItem[] = useMemo(() => {
    const byNumber = new Map(sessionRoundGroups.map((g) => [g.roundNumber, g]));
    const numbers = new Set(sessionRoundGroups.map((g) => g.roundNumber));
    numbers.add(currentRound);
    if (!isGroupStageMode && maxRounds != null && maxRounds > 0) {
      for (let n = 1; n <= maxRounds; n++) numbers.add(n);
    }
    // Ensure every planned group-stage / bracket round from startable fixtures appears.
    for (const f of startableGroupMatches) {
      if (f.roundNumber > 0) numbers.add(f.roundNumber);
    }
    for (const f of startableBracketMatches) {
      if (f.roundNumber > 0) numbers.add(f.roundNumber);
    }

    return [...numbers]
      .filter((n) => n > 0 && n < 9000)
      .sort((a, b) => a - b)
      .map((roundNumber) => {
        const group = byNumber.get(roundNumber);
        const matchCount = group?.matches.length ?? 0;
        const completedCount = group?.completedCount ?? 0;
        const liveCount = group?.liveCount ?? 0;
        const pendingOnly =
          matchCount === 0
            ? isGroupStageMode
              ? startableGroupMatches.filter((f) => f.roundNumber === roundNumber).length
              : isBracketMode
                ? startableBracketMatches.filter((f) => f.roundNumber === roundNumber).length
                : 0
            : 0;
        const isComplete =
          matchCount > 0 && completedCount === matchCount && liveCount === 0;
        return {
          roundNumber,
          label: isGroupStageMode
            ? formatGroupStageRoundTabLabel(roundNumber)
            : String(roundNumber),
          liveCount,
          completedCount,
          matchCount: matchCount || pendingOnly,
          isComplete,
        };
      });
  }, [
    sessionRoundGroups,
    currentRound,
    maxRounds,
    startableGroupMatches,
    startableBracketMatches,
    isGroupStageMode,
    isBracketMode,
  ]);

  useEffect(() => {
    if (!tabItems.length) return;
    if (selectedRound != null && tabItems.some((t) => t.roundNumber === selectedRound)) {
      return;
    }
    setSelectedRound(activeRound);
  }, [tabItems, selectedRound, activeRound]);

  const displayRound = selectedRound ?? activeRound;

  const selectedGroup = useMemo(
    () => sessionRoundGroups.find((g) => g.roundNumber === displayRound) ?? null,
    [sessionRoundGroups, displayRound],
  );

  const roundMatches = useMemo(() => {
    const list = selectedGroup?.matches ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => matchMatchesSearch(m, q));
  }, [selectedGroup, search]);

  const startableGroupForRound = useMemo(
    () =>
      isGroupStageMode
        ? startableGroupMatches.filter((f) => f.roundNumber === displayRound)
        : startableGroupMatches,
    [isGroupStageMode, startableGroupMatches, displayRound],
  );

  const idleBracketForRound = useMemo(
    () =>
      isBracketMode
        ? (idleBracketPickerMatches.length > 0
            ? idleBracketPickerMatches
            : startableBracketMatches.filter((f) => f.status === "pending")
          ).filter((f) => f.roundNumber === displayRound)
        : [],
    [displayRound, idleBracketPickerMatches, isBracketMode, startableBracketMatches],
  );

  const startableBracketForRound = useMemo(
    () =>
      isBracketMode
        ? startableBracketMatches.filter((f) => f.roundNumber === displayRound)
        : startableBracketMatches,
    [isBracketMode, startableBracketMatches, displayRound],
  );

  const resting = useMemo(
    () => restingTeamNames(teams, selectedGroup?.matches ?? []),
    [teams, selectedGroup],
  );

  const idleCourts = useMemo(
    () => courts.filter((c) => !matchByCourt.get(c.id)),
    [courts, matchByCourt],
  );

  const courtStripItems = useMemo(() => {
    return courts.map((court) => {
      const match = matchByCourt.get(court.id) ?? null;
      const status: "live" | "idle" | "done" | "queued" = !match
        ? "idle"
        : match.status === "in_progress"
          ? "live"
          : match.status === "completed"
            ? "done"
            : "queued";
      return {
        court,
        match,
        status,
        scoreLabel:
          match && (match.status === "in_progress" || match.status === "completed")
            ? `${match.scoreA ?? 0}–${match.scoreB ?? 0}`
            : null,
      };
    });
  }, [courts, matchByCourt]);

  const liveCourtIds = useMemo(
    () =>
      courtStripItems.filter((c) => c.status === "live").map((c) => c.court.id),
    [courtStripItems],
  );

  useEffect(() => {
    if (!liveCourtIds.length) {
      if (focusedCourtId) setFocusedCourtId(null);
      setIdleExpandedWhileLive(false);
      return;
    }
    if (!focusedCourtId || !liveCourtIds.includes(focusedCourtId)) {
      setFocusedCourtId(liveCourtIds[0]!);
    }
  }, [liveCourtIds, focusedCourtId]);

  const canShowIdlePlanning =
    !startFixturesFromSchedule &&
    !scoringFrozen &&
    canManage &&
    !readOnly &&
    idleCourts.length > 0 &&
    (!isGroupStageMode || startableGroupForRound.length > 0 || startableGroupMatches.length > 0) &&
    (!isBracketMode || idleBracketForRound.length > 0 || startableGroupForRound.length > 0);

  /** Hide bulky idle block while live scoring is active — keep strip + live cards focused. */
  const showPlanningSlots =
    canShowIdlePlanning && (liveCourtIds.length === 0 || idleExpandedWhileLive);

  const roundHeading = isGroupStageMode
    ? formatGroupStageRoundTitle(displayRound)
    : isBracketMode
      ? `Knockout · Round ${displayRound}`
      : `Round #${displayRound}`;

  const selectedTab = tabItems.find((t) => t.roundNumber === displayRound);
  const roundStatus =
    selectedTab?.liveCount && selectedTab.liveCount > 0
      ? "Active"
      : selectedTab?.isComplete
        ? "Completed"
        : "Upcoming";

  return (
    <section className="flex flex-col rounded-2xl border border-cp-border bg-cp-card">
      <header className="space-y-3 border-b border-cp-border px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ListOrdered className="h-4 w-4 text-cp-primary" aria-hidden />
              {isGroupStageMode
                ? "Group stage courts"
                : isBracketMode
                  ? "Knockout courts"
                  : "Match rounds"}
            </h3>
            <span className="text-[11px] text-cp-muted">
              {isGroupStageMode
                ? startFixturesFromSchedule
                  ? `${courts.length} court${courts.length === 1 ? "" : "s"} · start from Match Schedule`
                  : `${courts.length} court${courts.length === 1 ? "" : "s"} · assign group fixtures`
                : isBracketMode
                  ? startFixturesFromSchedule
                    ? `${courts.length} court${courts.length === 1 ? "" : "s"} · start from Match Schedule`
                    : `${courts.length} court${courts.length === 1 ? "" : "s"}`
                  : `R${currentRound}${maxRounds != null ? `/${maxRounds}` : ""}`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-lg border border-cp-border bg-cp-elevated/30 p-0.5">
              <button
                type="button"
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors",
                  roundsLayout === "tabs"
                    ? "bg-cp-card text-foreground shadow-sm"
                    : "text-cp-muted hover:text-foreground",
                )}
                onClick={() => setLayout("tabs")}
                title="Horizontal round tabs"
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tabs</span>
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors",
                  roundsLayout === "stack"
                    ? "bg-cp-card text-foreground shadow-sm"
                    : "text-cp-muted hover:text-foreground",
                )}
                onClick={() => setLayout("stack")}
                title="Stacked rounds (vertical)"
              >
                <Rows3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stack</span>
              </button>
            </div>
            {canManage && !readOnly && !startFixturesFromSchedule ? (
              <>
                {onReshuffle ? (
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={onReshuffle}>
                    <Shuffle className="mr-1 h-3.5 w-3.5" />
                    Reshuffle
                  </Button>
                ) : null}
                {onStartAllCourts ? (
                  <Button type="button" size="sm" className="h-8" onClick={onStartAllCourts} disabled={startingAll}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Start all{isGroupStageMode || isBracketMode ? " courts" : ""}
                  </Button>
                ) : null}
                {onFinishRound ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    disabled={!hasActiveMatches}
                    onClick={onFinishRound}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Finish
                  </Button>
                ) : null}
              </>
            ) : canManage && !readOnly && startFixturesFromSchedule && onFinishRound ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8"
                disabled={!hasActiveMatches}
                onClick={onFinishRound}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Finish
              </Button>
            ) : null}
          </div>
        </div>

        {/* Round picker above search — avoids checklist badges colliding with the input */}
        {roundsLayout === "tabs" ? (
          <MatchRoundTabs
            rounds={tabItems}
            selectedRound={displayRound}
            activeRound={activeRound}
            onSelect={(round) => {
              setSelectedRound(round);
              setSearch("");
            }}
            accentVariant={accentVariant}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {tabItems.map((tab) => {
              const selected = tab.roundNumber === displayRound;
              return (
                <button
                  key={tab.roundNumber}
                  type="button"
                  onClick={() => {
                    setSelectedRound(tab.roundNumber);
                    setSearch("");
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                    selected
                      ? accentVariant === "official"
                        ? "border-cp-primary bg-cp-primary/15 text-foreground"
                        : "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                      : "border-cp-border bg-cp-elevated/20 text-cp-muted hover:bg-cp-elevated/40 hover:text-foreground",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    {isGroupStageMode
                      ? formatGroupStageRoundTitle(tab.roundNumber)
                      : `Round #${tab.roundNumber}`}
                    {tab.isComplete ? (
                      <CheckCircle2
                        className={cn(
                          "h-3.5 w-3.5",
                          accentVariant === "official" ? "text-cp-primary" : "text-emerald-400",
                        )}
                        aria-label="Completed"
                      />
                    ) : null}
                  </span>
                  <span className="tabular-nums text-[10px]">
                    {tab.liveCount > 0
                      ? `${tab.liveCount} live`
                      : tab.isComplete
                        ? "Done"
                        : `${tab.matchCount} match${tab.matchCount === 1 ? "" : "es"}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cp-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player or squad…"
            className="h-8 pl-8 text-xs"
            aria-label="Search matches in this round"
          />
        </div>
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        {courtStripItems.length > 0 ? (
          <div className="sticky top-2 z-20 -mx-1 rounded-xl border border-cp-border/80 bg-cp-card/95 px-1.5 py-1.5 shadow-sm backdrop-blur-sm sm:mx-0">
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                Courts
              </p>
              <p className="text-[10px] text-cp-muted">
                {liveCourtIds.length} live · tap to focus
              </p>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {courtStripItems.map(({ court, match, status, scoreLabel }) => {
                const focused = focusedCourtId === court.id;
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => {
                      if (status === "live") {
                        setFocusedCourtId(court.id);
                        return;
                      }
                      if (match) {
                        toggleExpandedMatch(match.id);
                      }
                    }}
                    onDoubleClick={() => {
                      if (status === "live" && onOpenCourtside) {
                        onOpenCourtside(court.id);
                      }
                    }}
                    className={cn(
                      "flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-lg border px-2 py-1.5 text-center transition-colors",
                      focused && status === "live"
                        ? accentVariant === "official"
                          ? "border-cp-primary bg-cp-primary/20 text-foreground"
                          : "border-emerald-500/60 bg-emerald-500/15 text-foreground"
                        : status === "live"
                          ? "border-amber-500/40 bg-amber-500/10 text-foreground hover:border-amber-500/60"
                          : "border-cp-border bg-cp-elevated/30 text-cp-muted hover:bg-cp-elevated/50 hover:text-foreground",
                    )}
                    title={
                      status === "live" && onOpenCourtside
                        ? `${court.name} — tap to focus, double-tap for courtside`
                        : court.name
                    }
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {court.name.replace(/^Court\s+/i, "C")}
                    </span>
                    <span className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                      {scoreLabel ?? "—"}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 text-[9px] font-semibold uppercase",
                        status === "live"
                          ? "text-amber-400"
                          : status === "done"
                            ? accentLabel
                            : "text-cp-muted",
                      )}
                    >
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              roundStatus === "Active" ? "text-amber-400" : "text-cp-muted",
            )}
          >
            {roundHeading}
            <span className="ml-2 font-semibold normal-case tracking-normal text-cp-muted">
              · {roundStatus}
            </span>
          </h4>
          <span className="text-[11px] tabular-nums text-cp-muted">
            {roundMatches.length} match{roundMatches.length === 1 ? "" : "es"}
            {selectedTab && selectedTab.completedCount > 0
              ? ` · ${selectedTab.completedCount} done`
              : ""}
          </span>
        </div>

        {roundMatches.length === 0 && !showPlanningSlots && !canShowIdlePlanning ? (
          <p className="py-6 text-center text-sm text-cp-muted">
            {search.trim()
              ? "No matches match your search in this round."
              : isGroupStageMode
                ? canManage && !readOnly
                  ? "No fixtures in this round yet. Assign groups or pick another round."
                  : "No matches in this round yet."
                : "No matches in this round yet. The host will start courts when ready."}
          </p>
        ) : null}

        {roundMatches.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
              Live & round matches
            </h4>
            {roundMatches.map((match, matchIndex) => {
              const court = courts.find((c) => c.id === match.courtId);
              const courtIndex = court
                ? courts.findIndex((c) => c.id === court.id)
                : matchIndex;
              const key = getReclubMatchHistoryKey(match);
              const isLiveMatch = match.status === "in_progress";
              const isFocusedLive =
                isLiveMatch && Boolean(match.courtId) && match.courtId === focusedCourtId;
              const expanded = expandedMatchIds.has(match.id);
              return (
                <FunMatchRoundMatchCard
                  key={key}
                  match={match}
                  courtId={match.courtId ?? undefined}
                  courtName={resolveCourtLabel(match.courtId, courts, courtIndex)}
                  scorekeeperName={match.scorekeeperName ?? null}
                  teams={teams}
                  activeGroupMatches={isGroupStageMode ? activeGroupMatches : []}
                  isGroupStageMode={isGroupStageMode}
                  canManage={canManage && !readOnly}
                  readOnly={readOnly}
                  pointsPerMatch={pointsPerMatch}
                  scoringRules={scoringRules}
                  gameRules={resolveGameRules?.(match) ?? gameRules}
                  classicSetRules={classicSetRules}
                  scoreEntryMode={scoreEntryMode}
                  sportSlug={sportSlug}
                  tournamentSlug={tournamentSlug}
                  onOverrideSuccess={onOverrideSuccess}
                  density="command"
                  forceExpanded={isFocusedLive || expanded}
                  onToggleExpanded={() => {
                    if (isLiveMatch && match.courtId) {
                      setFocusedCourtId((prev) =>
                        prev === match.courtId ? null : match.courtId!,
                      );
                      return;
                    }
                    toggleExpandedMatch(match.id);
                  }}
                  onOpenCourtside={
                    isLiveMatch && match.courtId && onOpenCourtside
                      ? () => onOpenCourtside(match.courtId!)
                      : undefined
                  }
                  onScoreChange={(input) =>
                    onScoreChange(match.id, {
                      ...input,
                      isBracket:
                        match.sourceKind === "bracket" || match.playType === "bracket",
                      isGroup:
                        match.sourceKind === "group_stage" || match.playType === "group_stage",
                    })
                  }
                  onComplete={() => onCompleteMatch(match)}
                  onEditCourtName={
                    match.courtId
                      ? () => onEditCourtName(match.courtId!, court?.name ?? "")
                      : undefined
                  }
                  accentVariant={accentVariant}
                />
              );
            })}
          </div>
        ) : null}

        {startFixturesFromSchedule && canManage && !readOnly && liveCourtIds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cp-border/70 bg-cp-elevated/10 px-3 py-3 text-center text-xs text-cp-muted">
            Pick a court on <span className="font-semibold text-foreground">Match Schedule</span>, then
            press <span className="font-semibold text-foreground">Start</span> — scoring opens here
            automatically.
          </p>
        ) : null}

        {canShowIdlePlanning && liveCourtIds.length > 0 && !idleExpandedWhileLive ? (
          <button
            type="button"
            onClick={() => setIdleExpandedWhileLive(true)}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-cp-border/60 bg-cp-elevated/10 px-3 py-2 text-left text-xs text-cp-muted transition-colors hover:border-cp-border hover:bg-cp-elevated/25 hover:text-foreground"
          >
            <span>
              Idle courts hidden while scoring ·{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {idleCourts.length}
              </span>{" "}
              ready to start next
            </span>
            <span className={cn("font-semibold", accentLabel)}>Show</span>
          </button>
        ) : null}

        {showPlanningSlots ? (
          <div className="rounded-xl border border-dashed border-cp-border/70 bg-cp-elevated/15 p-2.5 sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className={cn("text-[10px] font-bold uppercase tracking-wider", accentLabel)}>
                Idle courts · start next
              </h4>
              {liveCourtIds.length > 0 ? (
                <button
                  type="button"
                  className="text-[11px] font-medium text-cp-muted hover:text-foreground"
                  onClick={() => setIdleExpandedWhileLive(false)}
                >
                  Hide
                </button>
              ) : null}
            </div>
            <div className="space-y-2">
              {idleCourts.map((court) => (
                <FunMatchRoundMatchCard
                  key={court.id}
                  courtId={court.id}
                  courtName={court.name}
                  teams={teams.filter((t) => t.memberCount > 0)}
                  teamAId={teamAByCourt[court.id] ?? ""}
                  teamBId={teamBByCourt[court.id] ?? ""}
                  bracketMatchId={bracketPickByCourt[court.id] ?? ""}
                  groupMatchId={groupPickByCourt[court.id] ?? ""}
                  groupPickByCourt={isGroupStageMode ? groupPickByCourt : {}}
                  startableBracketMatches={isBracketMode ? idleBracketForRound : []}
                  startableGroupMatches={isGroupStageMode ? startableGroupForRound : []}
                  activeGroupMatches={isGroupStageMode ? activeGroupMatches : []}
                  isGroupStageMode={isGroupStageMode}
                  isBracketMode={isBracketMode}
                  onGroupPickChange={(v) => onGroupPickChange?.(court.id, v)}
                  onTeamAChange={(v) => onTeamAChange(court.id, v)}
                  onTeamBChange={(v) => onTeamBChange(court.id, v)}
                  onBracketPickChange={(v) => onBracketPickChange?.(court.id, v)}
                  onStart={() => onStartCourt(court.id)}
                  isStarting={isCourtStarting?.(court.id) ?? false}
                  canManage
                  pointsPerMatch={pointsPerMatch}
                  scoringRules={scoringRules}
                  gameRules={gameRules}
                  classicSetRules={classicSetRules}
                  onEditCourtName={() => onEditCourtName(court.id, court.name)}
                  accentVariant={accentVariant}
                  isAmericanoMode={isAmericanoMode}
                  americanoPlayers={americanoPlayers}
                  onManageAmericanoPairings={
                    onManageAmericanoPairings
                      ? () => onManageAmericanoPairings(court.id)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {roundMatches.length === 0 && showPlanningSlots ? (
          <p className="text-center text-xs text-cp-muted">
            Assign fixtures on idle courts, then start scoring.
          </p>
        ) : null}

        {resting.length > 0 && (isGroupStageMode || isAmericanoMode) ? (
          <RestTeamsPanel
            teamNames={resting}
            variant={accentVariant === "official" ? "official" : "fun"}
          />
        ) : null}
      </div>
    </section>
  );
}
