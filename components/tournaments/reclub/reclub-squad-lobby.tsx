"use client";

import Image from "next/image";
import { Loader2, LogOut, Plus, Swords, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SquadNameEditor } from "@/components/tournaments/reclub/squad-name-editor";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
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

type ReclubSquadLobbyProps = {
  teams: LobbyTeamView[];
  playersPerTeam: number;
  maxTeams?: number | null;
  session: ReclubSessionSchedule;
  userTeamId: string | null;
  currentUserId: string | null;
  activeMatch: boolean;
  canManage?: boolean;
  isLoading?: boolean;
  onJoinClick: (preselectedTeamId?: string) => void;
  onSwitchTeam: (teamId: string) => void;
  onRenameTeam?: (teamId: string, name: string) => Promise<void>;
  onLeave?: () => void;
  canLeave?: boolean;
  leaving?: boolean;
  renamingTeamId?: string | null;
  captainUserIdByTeam?: Record<string, string | null>;
};

export function ReclubSquadLobby({
  teams,
  playersPerTeam,
  maxTeams,
  session,
  userTeamId,
  currentUserId,
  activeMatch,
  canManage = false,
  isLoading,
  onJoinClick,
  onSwitchTeam,
  onRenameTeam,
  onLeave,
  canLeave = false,
  leaving,
  renamingTeamId,
  captainUserIdByTeam = {},
}: ReclubSquadLobbyProps) {
  const sessionPhase = computeReclubSessionPhase(session);
  const canJoin = canJoinReclubSession(session) && !activeMatch;
  const teamsAtCapacity = maxTeams != null && maxTeams > 0 && teams.length >= maxTeams;
  const canCreate = canCreateReclubSquad({
    session,
    hasActiveMatch: activeMatch,
    teamsAtCapacity,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!userTeamId ? (
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-cp-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Join this session</h2>
              <p className="mt-1 max-w-xl text-sm text-cp-muted">
                Create a new squad or join one with open slots — your choice.
              </p>
            </div>
            {canJoin ? (
              <Button
                className="w-full shrink-0 bg-emerald-600 hover:bg-emerald-500 sm:w-auto"
                onClick={() => onJoinClick()}
              >
                <Swords className="mr-2 h-4 w-4" />
                Join lobby
              </Button>
            ) : (
              <p className="text-sm text-cp-muted">
                {sessionPhase === "ended"
                  ? getReclubSessionEndedMessage()
                  : activeMatch
                    ? "Squads are locked while a round is live."
                    : "Registration for this session is not open yet."}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <Badge variant="success" className="mb-2">
              You&apos;re in the lobby
            </Badge>
            <p className="text-sm text-cp-muted">
              Switch squads below, or open Join / create squad to add another team.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canJoin ? (
              <Button variant="outline" className="border-emerald-500/40" onClick={() => onJoinClick()}>
                <UserPlus className="mr-2 h-4 w-4" />
                Join / create squad
              </Button>
            ) : null}
            {canLeave ? (
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                disabled={leaving}
                onClick={onLeave}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Leave session
              </Button>
            ) : null}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Squads</h3>
          <p className="text-sm text-cp-muted">
            {teams.length} squad{teams.length === 1 ? "" : "s"} · up to {playersPerTeam} players
            each
          </p>
        </div>
        {canJoin && !userTeamId && teams.length === 0 ? (
          <Button size="sm" variant="outline" onClick={() => onJoinClick()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create first squad
          </Button>
        ) : null}
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/50 px-4 py-10 text-center">
          <Users className="mx-auto h-8 w-8 text-cp-muted" />
          <p className="mt-3 text-sm font-medium text-foreground">No squads yet</p>
          <p className="mt-1 text-sm text-cp-muted">Be the first to create a squad and invite friends.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const isUserTeam = team.id === userTeamId;
            const isFull = team.memberCount >= playersPerTeam;
            const canSwitch =
              canJoin &&
              currentUserId &&
              !isUserTeam &&
              !isFull &&
              userTeamId != null;

            const canRename = canRenameReclubSquad({
              session,
              hasActiveMatch: activeMatch,
              canManage,
              captainUserId: captainUserIdByTeam[team.id] ?? null,
              currentUserId,
            });

            return (
              <article
                key={team.id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-cp-card p-4 transition-colors",
                  isUserTeam
                    ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                    : "border-cp-border",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {canRename && onRenameTeam ? (
                      <SquadNameEditor
                        name={team.name}
                        canEdit
                        saving={renamingTeamId === team.id}
                        onSave={(name) => onRenameTeam(team.id, name)}
                      />
                    ) : (
                      <h4 className="truncate font-semibold text-foreground">{team.name}</h4>
                    )}
                    <p className="mt-0.5 text-xs text-cp-muted">
                      {team.memberCount}/{playersPerTeam} players
                    </p>
                  </div>
                  {isUserTeam ? (
                    <Badge variant="success" className="shrink-0">
                      Your squad
                    </Badge>
                  ) : isFull ? (
                    <Badge variant="muted" className="shrink-0">
                      Full
                    </Badge>
                  ) : null}
                </div>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {team.members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-center gap-2 rounded-full border border-cp-border bg-cp-elevated/40 py-1 pr-3 pl-1"
                    >
                      <span className="relative h-7 w-7 overflow-hidden rounded-full bg-cp-elevated">
                        {member.image ? (
                          <Image
                            src={resolveUserImageUrl(member.image) ?? member.image}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-cp-muted">
                            {member.displayName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="max-w-[8rem] truncate text-xs font-medium text-foreground">
                        {member.displayName}
                        {member.userId === currentUserId ? " (you)" : ""}
                      </span>
                    </li>
                  ))}
                </ul>

                {canSwitch ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full border-cp-border"
                    onClick={() => onSwitchTeam(team.id)}
                  >
                    Switch to this squad
                  </Button>
                ) : !userTeamId && canJoin && !isFull ? (
                  <Button
                    size="sm"
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => onJoinClick(team.id)}
                  >
                    Join this squad
                  </Button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {canJoin && canCreate && userTeamId ? (
        <p className="text-center text-xs text-cp-muted">
          Need another squad? Use Join / create squad to add one
          {teamsAtCapacity ? " (max squads reached)" : ""}.
        </p>
      ) : null}
    </div>
  );
}
