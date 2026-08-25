import { describe, expect, it } from "vitest";
import { computeParallelCapacity } from "@/lib/tournaments/courts/parallel-capacity";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";

function squad(id: string, name: string): LobbyTeamView {
  return {
    id,
    name,
    captainUserId: null,
    memberCount: 2,
    members: [
      { userId: `${id}-p1`, displayName: `${name} P1`, image: null, slotIndex: 0, role: "member" },
      { userId: `${id}-p2`, displayName: `${name} P2`, image: null, slotIndex: 1, role: "member" },
    ],
  };
}

function groupMatch(
  id: string,
  teamAId: string,
  teamBId: string,
  status: GroupMatchView["status"] = "pending",
  courtId: string | null = null,
): GroupMatchView {
  return {
    id,
    groupId: "g1",
    matchNumber: 1,
    teamAId,
    teamBId,
    teamAName: teamAId,
    teamBName: teamBId,
    teamAPlayers: [],
    teamBPlayers: [],
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    status,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    courtId,
    playOrder: null,
    roundNumber: 1,
    callStatus: "queued",
    scoreEvents: [],
  };
}

describe("computeParallelCapacity", () => {
  const courts = [
    { id: "c1", name: "Court 1" },
    { id: "c2", name: "Court 2" },
    { id: "c3", name: "Court 3" },
    { id: "c4", name: "Court 4" },
  ];

  const squads = [squad("t1", "Team 1"), squad("t2", "Team 2"), squad("t3", "Team 3")];

  it("allows only one parallel slot when three teams share one group", () => {
    const result = computeParallelCapacity({
      courts,
      mode: "groups",
      activeReclub: [],
      activeBracket: [],
      activeGroup: [groupMatch("m-live", "t1", "t2", "in_progress", "c1")],
      squads,
      startableGroup: [groupMatch("m2", "t1", "t3"), groupMatch("m3", "t2", "t3")],
    });

    expect(result.liveCourtCount).toBe(1);
    expect(result.idleCourtCount).toBe(3);
    expect(result.assignableSlots).toBe(0);
    expect(result.restingTeamNames).toContain("Team 3");
    expect(result.blockReason).toMatch(/resting/i);
  });

  it("assigns cross-group fixtures on two idle courts", () => {
    const squadsSix = [
      squad("a1", "Group A · Team 1"),
      squad("a2", "Group A · Team 2"),
      squad("b1", "Group B · Team 1"),
      squad("b2", "Group B · Team 2"),
    ];

    const result = computeParallelCapacity({
      courts,
      mode: "groups",
      activeReclub: [],
      activeBracket: [],
      activeGroup: [],
      squads: squadsSix,
      startableGroup: [
        groupMatch("m1", "a1", "a2"),
        { ...groupMatch("m2", "b1", "b2"), groupId: "g2", matchNumber: 1 },
      ],
    });

    expect(result.assignableSlots).toBe(2);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0]?.courtId).toBe("c1");
    expect(result.assignments[1]?.courtId).toBe("c2");
  });

  it("pairs two idle squads on one court in squads mode", () => {
    const result = computeParallelCapacity({
      courts: courts.slice(0, 2),
      mode: "squads",
      activeReclub: [],
      activeBracket: [],
      activeGroup: [],
      squads,
      seed: 42,
    });

    expect(result.assignableSlots).toBe(1);
    expect(result.assignments[0]?.teamAId).toBeTruthy();
    expect(result.assignments[0]?.teamBId).toBeTruthy();
    expect(result.restingTeamNames).toHaveLength(1);
  });
});
