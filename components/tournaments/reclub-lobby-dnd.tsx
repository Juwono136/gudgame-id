"use client";

import { useState } from "react";
import Image from "next/image";
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
import { GripVertical, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SquadCreateForm } from "@/components/tournaments/reclub/squad-create-form";
import { SquadNameEditor } from "@/components/tournaments/reclub/squad-name-editor";
import type { LobbyTeamView, LobbyMemberView } from "@/lib/tournaments/reclub/teams";
import {
  canCreateReclubSquad,
  canRenameReclubSquad,
} from "@/lib/tournaments/reclub/squad-names";
import {
  canJoinReclubSession,
  computeReclubSessionPhase,
  getReclubSessionEndedMessage,
  type ReclubSessionSchedule,
} from "@/lib/tournaments/reclub/session-lifecycle";
import { resolveUserImageUrl } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type ReclubLobbyDndProps = {
  teams: LobbyTeamView[];
  playersPerTeam: number;
  maxTeams?: number | null;
  session: ReclubSessionSchedule;
  userTeamId: string | null;
  currentUserId: string | null;
  activeMatch: boolean;
  canManage?: boolean;
  onSwitchTeam: (teamId: string) => void;
  onCreateTeam: (name: string) => Promise<void>;
  onRenameTeam?: (teamId: string, name: string) => Promise<void>;
  onLeave?: () => void;
  canLeave?: boolean;
  creating?: boolean;
  renamingTeamId?: string | null;
  leaving?: boolean;
};

export function ReclubLobbyDnd({
  teams,
  playersPerTeam,
  maxTeams,
  session,
  userTeamId,
  currentUserId,
  activeMatch,
  onSwitchTeam,
  onCreateTeam,
  onRenameTeam,
  onLeave,
  canLeave = false,
  canManage = false,
  creating,
  renamingTeamId,
  leaving,
}: ReclubLobbyDndProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (activeMatch || !canJoinReclubSession(session)) return;
    const overId = e.over?.id;
    if (!overId || !String(overId).startsWith("team-")) return;
    const teamId = String(overId).replace("team-", "");
    const draggedUser = String(e.active.id).replace("player-", "");
    if (currentUserId && draggedUser === currentUserId) {
      onSwitchTeam(teamId);
    }
  };

  const activeMember = teams
    .flatMap((t) => t.members)
    .find((m) => `player-${m.userId}` === activeId);

  const teamsAtCapacity =
    maxTeams != null && maxTeams > 0 && teams.length >= maxTeams;

  const sessionPhase = computeReclubSessionPhase(session);

  const allowCreate = canCreateReclubSquad({
    session,
    hasActiveMatch: activeMatch,
    teamsAtCapacity,
  });

  return (
    <div className="space-y-4">
      {allowCreate ? (
        <div>
          {showCreate ? (
            <SquadCreateForm
              onSubmit={onCreateTeam}
              onCancel={() => setShowCreate(false)}
              disabled={creating}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-cp-border hover:border-emerald-500/40 hover:bg-emerald-500/5"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create squad
            </Button>
          )}
        </div>
      ) : teamsAtCapacity ? (
        <p className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 text-xs text-cp-muted">
          Squad limit reached ({maxTeams} max). Switch to an existing squad or wait for a slot.
        </p>
      ) : activeMatch ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
          Squads are locked during an active round.
        </p>
      ) : sessionPhase === "ended" ? (
        <p className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 text-xs text-cp-muted">
          {getReclubSessionEndedMessage()}
        </p>
      ) : null}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <TeamLane
              key={team.id}
              team={team}
              index={i}
              playersPerTeam={playersPerTeam}
              isUserTeam={userTeamId === team.id}
              canDrop={
                canJoinReclubSession(session) &&
                !activeMatch &&
                team.memberCount < playersPerTeam
              }
              currentUserId={currentUserId}
              onSwitchTeam={onSwitchTeam}
              activeMatch={activeMatch}
              canRename={
                Boolean(onRenameTeam) &&
                canRenameReclubSquad({
                  session,
                  hasActiveMatch: activeMatch,
                  canManage,
                  captainUserId: team.captainUserId,
                  currentUserId,
                })
              }
              onRenameTeam={onRenameTeam}
              renaming={renamingTeamId === team.id}
              canLeave={canLeave}
              onLeave={onLeave}
              leaving={leaving}
            />
          ))}
        </div>
        <DragOverlay>
          {activeMember ? (
            <PlayerChip name={activeMember.displayName} image={activeMember.image} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="text-center text-xs text-cp-text-dim">
        {activeMatch
          ? "Teams are locked during an active round."
          : "Drag your avatar to another squad to switch teams."}
      </p>
    </div>
  );
}

function TeamLane({
  team,
  index,
  playersPerTeam,
  isUserTeam,
  canDrop,
  currentUserId,
  onSwitchTeam,
  activeMatch,
  canRename,
  onRenameTeam,
  renaming,
  canLeave,
  onLeave,
  leaving,
}: {
  team: LobbyTeamView;
  index: number;
  playersPerTeam: number;
  isUserTeam: boolean;
  canDrop: boolean;
  currentUserId: string | null;
  onSwitchTeam: (teamId: string) => void;
  activeMatch: boolean;
  canRename: boolean;
  onRenameTeam?: (teamId: string, name: string) => Promise<void>;
  renaming?: boolean;
  canLeave?: boolean;
  onLeave?: () => void;
  leaving?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `team-${team.id}` });
  const slots = Array.from({ length: playersPerTeam }, (_, i) => team.members[i] ?? null);

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-2xl border bg-cp-card p-4 sm:p-5 transition-colors",
        isUserTeam ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-cp-border",
        canDrop && isOver && "border-emerald-400 bg-emerald-950/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {onRenameTeam ? (
          <SquadNameEditor
            name={team.name}
            canEdit={canRename}
            saving={renaming}
            onSave={(nextName) => onRenameTeam(team.id, nextName)}
          />
        ) : (
          <h3 className="truncate font-semibold text-foreground">{team.name}</h3>
        )}
        <span className="shrink-0 rounded-full bg-cp-elevated px-2 py-0.5 text-xs tabular-nums text-cp-muted">
          {team.memberCount}/{playersPerTeam}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {slots.map((member, j) =>
          member ? (
            <DraggablePlayer
              key={member.userId}
              member={member}
              isSelf={member.userId === currentUserId}
              canLeave={canLeave && member.userId === currentUserId}
              onLeave={onLeave}
              leaving={leaving}
            />
          ) : (
            <div
              key={`open-${j}`}
              className="flex h-10 items-center justify-center rounded-lg border border-dashed border-cp-border text-xs text-cp-muted"
            >
              Open slot
            </div>
          ),
        )}
      </div>
      {!activeMatch &&
      currentUserId &&
      !isUserTeam &&
      team.memberCount < playersPerTeam ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full border-cp-border sm:hidden"
          onClick={() => onSwitchTeam(team.id)}
        >
          Switch here
        </Button>
      ) : null}
    </motion.div>
  );
}

function DraggablePlayer({
  member,
  isSelf,
  canLeave,
  onLeave,
  leaving,
}: {
  member: LobbyMemberView;
  isSelf: boolean;
  canLeave?: boolean;
  onLeave?: () => void;
  leaving?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${member.userId}`,
    disabled: !isSelf,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg bg-cp-elevated/50 px-2 py-2",
        isSelf && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...(isSelf ? { ...listeners, ...attributes } : {})}
    >
      {isSelf ? <GripVertical className="h-4 w-4 shrink-0 text-cp-muted" /> : null}
      <PlayerChip name={member.displayName} image={member.image} />
      {canLeave && onLeave ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
          disabled={leaving}
          onClick={(e) => {
            e.stopPropagation();
            onLeave();
          }}
        >
          <LogOut className="mr-1 h-3.5 w-3.5" />
          Leave
        </Button>
      ) : null}
    </div>
  );
}

function PlayerChip({
  name,
  image,
  dragging,
}: {
  name: string;
  image: string | null;
  dragging?: boolean;
}) {
  const src = resolveUserImageUrl(image);
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-2",
        dragging && "rounded-lg border border-cp-primary bg-cp-card px-2 py-1 shadow-lg",
      )}
    >
      {src ? (
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
          <Image src={src} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cp-primary/20 text-xs font-bold text-cp-primary">
          {name.charAt(0)}
        </div>
      )}
      <span className="truncate text-sm text-foreground">{name}</span>
    </div>
  );
}
