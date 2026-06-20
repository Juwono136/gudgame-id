"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { GitBranch, GripVertical, Loader2, Sparkles, Users } from "lucide-react";
import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import { OfficialBracketLive } from "@/components/tournaments/official-bracket-live";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useAssignBracketTeam,
  useGenerateReclubBracket,
  useTournamentBracket,
} from "@/hooks/use-tournament-bracket";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import {
  canPlayReclubSession,
  computeReclubSessionPhase,
  type ReclubSessionSchedule,
} from "@/lib/tournaments/reclub/session-lifecycle";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { cn } from "@/lib/utils";

type ReclubBracketPanelProps = {
  sportSlug: string;
  slug: string;
  tournamentId: string;
  teams: LobbyTeamView[];
  canManage: boolean;
  participant: TournamentParticipantContext;
  userTeamId: string | null;
  tournamentStatus: string;
  session: ReclubSessionSchedule;
};

export function ReclubBracketPanel({
  sportSlug,
  slug,
  tournamentId,
  teams,
  canManage,
  participant,
  userTeamId,
  tournamentStatus,
  session,
}: ReclubBracketPanelProps) {
  const { data, isLoading, isFetching } = useTournamentBracket(sportSlug, slug);
  const generate = useGenerateReclubBracket(sportSlug, slug);
  const assign = useAssignBracketTeam(sportSlug, slug);

  const sessionPhase = computeReclubSessionPhase(session);
  const canPlay = canPlayReclubSession(session);

  const matches = data?.matches ?? [];
  const generated = data?.generated ?? false;
  const seedingLocked = matches.some(
    (m) => m.status === "in_progress" || m.status === "completed",
  );
  const canSeed = canManage && generated && !seedingLocked && canPlay;

  const placedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of matches) {
      if (m.roundNumber === 1) {
        if (m.teamAId) ids.add(m.teamAId);
        if (m.teamBId) ids.add(m.teamBId);
      }
    }
    return ids;
  }, [matches]);

  const unplacedSquads = useMemo(
    () => teams.filter((t) => t.memberCount > 0 && !placedTeamIds.has(t.id)),
    [teams, placedTeamIds],
  );

  const activeSquads = teams.filter((t) => t.memberCount > 0).length;
  const canGenerate =
    canManage &&
    !generated &&
    activeSquads >= 2 &&
    sessionPhase !== "ended" &&
    tournamentStatus !== "cancelled";

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading bracket…" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <GitBranch className="h-5 w-5 text-emerald-400" />
            Elimination bracket
          </h2>
          <p className="mt-1 max-w-xl text-sm text-cp-muted">
            Single-elimination tree — winners advance, losers are out. Host seeds squads, scores
            matches live, and results sync to player history.
          </p>
        </div>
        {isFetching && !isLoading ? (
          <span className="text-xs text-cp-muted">Syncing…</span>
        ) : null}
      </div>

      {!generated ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 p-8 text-center"
        >
          <Sparkles className="mx-auto h-8 w-8 text-emerald-400/80" />
          <p className="mt-3 text-sm text-cp-muted">
            {activeSquads < 2
              ? "Need at least 2 squads with players before generating a bracket."
              : canManage
                ? "Generate the bracket when squads are ready. You can drag squads to seed round one."
                : "The host will generate the bracket when squads are ready."}
          </p>
          {canGenerate ? (
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-500"
              disabled={generate.isPending}
              onClick={() => generate.mutate(tournamentId)}
            >
              {generate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitBranch className="mr-2 h-4 w-4" />
              )}
              Generate bracket
            </Button>
          ) : null}
        </motion.div>
      ) : (
        <>
          {canSeed && unplacedSquads.length > 0 ? (
            <BracketSeedingPool
              squads={unplacedSquads}
              matches={matches.filter((m) => m.roundNumber === 1)}
              onAssign={(matchId, slot, teamId) =>
                assign.mutate({ matchId, slot, teamId })
              }
              assigning={assign.isPending}
            />
          ) : null}

          <section className="rounded-2xl border border-cp-border bg-cp-card/60 p-4 sm:p-6">
            <BracketTreeView
              matches={matches}
              highlightTeamIds={userTeamId ? [userTeamId] : []}
              emptyMessage="Bracket is being prepared…"
            />
          </section>

          <OfficialBracketLive
            sportSlug={sportSlug}
            slug={slug}
            matches={matches}
            participant={participant}
            showBracketTree={false}
            variant="reclub"
          />
        </>
      )}
    </div>
  );
}

function BracketSeedingPool({
  squads,
  matches,
  onAssign,
  assigning,
}: {
  squads: LobbyTeamView[];
  matches: BracketMatchView[];
  onAssign: (matchId: string, slot: "a" | "b", teamId: string) => void;
  assigning?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId || !String(overId).startsWith("slot-")) return;
    const [, matchId, slot] = String(overId).split("-");
    const teamId = String(e.active.id).replace("squad-", "");
    if (!matchId || (slot !== "a" && slot !== "b") || !teamId) return;
    onAssign(matchId, slot, teamId);
  };

  const activeSquad = squads.find((s) => `squad-${s.id}` === activeId);

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <Users className="h-4 w-4" />
        Seed squads — drag into round one slots
      </h3>
      <p className="mt-1 text-xs text-cp-muted">
        Drag unplaced squads onto bracket slots below. Seeding locks once any match starts.
      </p>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="mt-4 flex flex-wrap gap-2">
          {squads.map((s) => (
            <DraggableSquad key={s.id} squad={s} disabled={assigning} />
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <div key={m.id} className="rounded-xl border border-cp-border/80 bg-cp-card p-2">
              <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-cp-muted">
                Match {m.matchNumber}
              </p>
              <SlotDropZone matchId={m.id} slot="a" label={m.teamAName} />
              <div className="my-1 border-t border-cp-border/50" />
              <SlotDropZone matchId={m.id} slot="b" label={m.teamBName} />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeSquad ? (
            <div className="rounded-lg border border-emerald-400 bg-cp-card px-3 py-2 text-sm font-medium shadow-lg">
              {activeSquad.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

function DraggableSquad({ squad, disabled }: { squad: LobbyTeamView; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `squad-${squad.id}`,
    disabled,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "inline-flex cursor-grab items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-3 py-2 text-sm active:cursor-grabbing",
        isDragging && "opacity-40",
        disabled && "pointer-events-none opacity-50",
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-3.5 w-3.5 text-cp-muted" />
      {squad.name}
      <span className="text-xs text-cp-muted">({squad.memberCount})</span>
    </div>
  );
}

function SlotDropZone({
  matchId,
  slot,
  label,
}: {
  matchId: string;
  slot: "a" | "b";
  label: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${matchId}-${slot}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-9 items-center justify-center rounded-lg border border-dashed px-2 py-1.5 text-xs transition-colors",
        isOver
          ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
          : "border-cp-border text-cp-muted",
      )}
    >
      {label ?? "Drop here"}
    </div>
  );
}
