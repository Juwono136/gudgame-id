import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { LobbyMemberView, LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { isSyntheticLineupUserId } from "@/lib/format/player-names";

export type OfficialTeamMemberSource = {
  userId: string;
  displayName: string;
  image?: string | null;
  role?: string;
  teamId: string;
  teamName: string;
};

function upsertTeam(
  map: Map<string, LobbyTeamView>,
  teamId: string,
  teamName: string,
): LobbyTeamView {
  const existing = map.get(teamId);
  if (existing) return existing;
  const team: LobbyTeamView = {
    id: teamId,
    name: teamName,
    captainUserId: null,
    memberCount: 0,
    members: [],
  };
  map.set(teamId, team);
  return team;
}

function memberIdentityKey(member: Pick<LobbyMemberView, "userId" | "displayName">): string {
  if (!isSyntheticLineupUserId(member.userId)) return `id:${member.userId}`;
  return `name:${member.displayName.trim().toLowerCase()}`;
}

function addMember(
  team: LobbyTeamView,
  member: Pick<LobbyMemberView, "userId" | "displayName" | "image" | "role">,
) {
  const key = memberIdentityKey(member);
  if (team.members.some((m) => memberIdentityKey(m) === key)) return;
  team.members.push({
    userId: member.userId,
    displayName: member.displayName,
    image: member.image ?? null,
    slotIndex: team.members.length,
    role: member.role ?? "member",
  });
}

function addLineupNames(
  team: LobbyTeamView,
  playerNames: string[] | undefined,
  matchId: string,
  side: "a" | "b",
) {
  if (team.members.length > 0) return;
  for (const [index, name] of (playerNames ?? []).entries()) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    addMember(team, {
      userId: `lineup-${matchId}-${side}-${index}`,
      displayName: trimmed,
      image: null,
      role: "member",
    });
  }
}

export function buildOfficialTeamsFromParticipants(
  participants: OfficialTeamMemberSource[],
): LobbyTeamView[] {
  const map = new Map<string, LobbyTeamView>();
  for (const participant of participants) {
    const team = upsertTeam(map, participant.teamId, participant.teamName);
    addMember(team, {
      userId: participant.userId,
      displayName: participant.displayName,
      image: participant.image ?? null,
      role: participant.role ?? "member",
    });
  }
  return finalizeOfficialTeams(map);
}

export function buildOfficialTeamsFromLivePlayers(
  players: Array<{
    teamId: string;
    teamName: string;
    members: Array<{
      userId: string;
      name: string | null;
      image?: string | null;
      role?: string;
    }>;
  }>,
): LobbyTeamView[] {
  const map = new Map<string, LobbyTeamView>();
  for (const squad of players) {
    const team = upsertTeam(map, squad.teamId, squad.teamName);
    for (const member of squad.members) {
      addMember(team, {
        userId: member.userId,
        displayName: member.name ?? "Player",
        image: member.image ?? null,
        role: member.role ?? "member",
      });
    }
  }
  return finalizeOfficialTeams(map);
}

export function enrichOfficialTeamsFromBracket(
  teams: LobbyTeamView[],
  bracketMatches: BracketMatchView[],
): LobbyTeamView[] {
  const map = new Map<string, LobbyTeamView>();
  for (const team of teams) {
    map.set(team.id, { ...team, members: [...team.members] });
  }

  for (const match of bracketMatches) {
    if (match.teamAId && match.teamAName) {
      const team = upsertTeam(map, match.teamAId, match.teamAName);
      addLineupNames(team, match.teamAPlayers, match.id, "a");
    }
    if (match.teamBId && match.teamBName) {
      const team = upsertTeam(map, match.teamBId, match.teamBName);
      addLineupNames(team, match.teamBPlayers, match.id, "b");
    }
  }

  return finalizeOfficialTeams(map);
}

export function mergeOfficialTeams(...groups: LobbyTeamView[][]): LobbyTeamView[] {
  const map = new Map<string, LobbyTeamView>();
  for (const group of groups) {
    for (const team of group) {
      const existing = map.get(team.id);
      if (!existing) {
        map.set(team.id, { ...team, members: [...team.members] });
        continue;
      }
      for (const member of team.members) {
        addMember(existing, member);
      }
      if (existing.name === "Team" && team.name) {
        existing.name = team.name;
      }
    }
  }
  return finalizeOfficialTeams(map);
}

function finalizeOfficialTeams(map: Map<string, LobbyTeamView>): LobbyTeamView[] {
  return [...map.values()]
    .map((team) => ({
      ...team,
      memberCount: team.members.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
