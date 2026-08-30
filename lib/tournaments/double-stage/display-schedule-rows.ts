/**
 * Build Order-of-Play rows for venue TV from live payload, merging real-time match state.
 */

import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import {
  groupMatchesByOrderOfPlay,
  parseCallStatus,
  type OrderOfPlayBucket,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";

export type DisplayScheduleLiveData = Pick<
  TournamentLivePayload,
  "matches" | "courts" | "bracket" | "tournament" | "doubleStage"
>;

type LiveMatchRow = NonNullable<TournamentLivePayload["matches"]>[number];

function pairKey(a: string | null | undefined, b: string | null | undefined): string | null {
  const left = a?.trim();
  const right = b?.trim();
  if (!left || !right) return null;
  return [left, right].sort().join("|");
}

function namePairKey(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const left = a?.trim().toLowerCase();
  const right = b?.trim().toLowerCase();
  if (!left || !right) return null;
  return [left, right].sort().join("|");
}

function buildLiveMatchIndex(matches: LiveMatchRow[]) {
  const byId = new Map<string, LiveMatchRow>();
  const byTeamIds = new Map<string, LiveMatchRow>();
  const byTeamNames = new Map<string, LiveMatchRow>();
  const byBracketId = new Map<string, LiveMatchRow>();

  for (const m of matches) {
    byId.set(m.id, m);
    const teamKey = pairKey(m.teamAId, m.teamBId);
    if (teamKey) byTeamIds.set(teamKey, m);
    const nameKey = namePairKey(m.teamAName, m.teamBName);
    if (nameKey) byTeamNames.set(nameKey, m);
    if (m.bracketMatchId) byBracketId.set(m.bracketMatchId, m);
  }

  return { byId, byTeamIds, byTeamNames, byBracketId };
}

function resolveLiveForScheduleRow(
  row: ScheduleMatchRow,
  index: ReturnType<typeof buildLiveMatchIndex>,
): LiveMatchRow | undefined {
  const byId = index.byId.get(row.id);
  if (byId) return byId;

  if (row.kind === "bracket") {
    const byBracket = index.byBracketId.get(row.id);
    if (byBracket) return byBracket;
  }

  const nameKey = namePairKey(row.teamAName, row.teamBName);
  if (nameKey) {
    return index.byTeamNames.get(nameKey);
  }

  return undefined;
}

/** Merge authoritative live payload fields into a schedule row. */
export function mergeScheduleRowWithLiveMatch(
  row: ScheduleMatchRow,
  live: LiveMatchRow | undefined,
  courts: DisplayScheduleLiveData["courts"],
): ScheduleMatchRow {
  if (!live) return row;

  const status = live.status?.trim() || row.status;
  const courtId = live.courtId ?? row.courtId;
  const courtName = resolveCourtLabel(courtId, courts ?? []) || row.courtName;

  let callStatus = row.callStatus;
  if (status === "completed" || status === "bye") {
    callStatus = "done";
  } else if (status === "in_progress") {
    callStatus =
      callStatus === "called" ? "called" : ("on_court" as const);
  }

  return {
    ...row,
    status,
    scoreA: live.scoreA ?? row.scoreA,
    scoreB: live.scoreB ?? row.scoreB,
    courtId,
    courtName,
    startedAt: live.startedAt ?? row.startedAt,
    callStatus,
  };
}

export function mapLiveToDisplayScheduleRows(
  liveData: DisplayScheduleLiveData,
): ScheduleMatchRow[] {
  const courts = liveData.courts ?? [];
  const bracketMatches = (liveData.bracket?.matches ?? []) as BracketMatchView[];
  const totalRounds = bracketMatches.length
    ? Math.max(...bracketMatches.map((m) => m.roundNumber), 1)
    : 1;

  const groupRows: ScheduleMatchRow[] = (liveData.matches ?? [])
    .filter((m) => m.type === "group_stage")
    .map((m) => {
      const groupName =
        typeof m.groupId === "string"
          ? (
              (liveData.doubleStage?.groups ?? []) as Array<{ id?: string; name?: string }>
            ).find((g) => g.id === m.groupId)?.name ?? null
          : null;
      return {
        id: m.id,
        kind: "group" as const,
        stageLabel: groupName ? `Group stage · ${groupName}` : "Group stage",
        stageKindLabel: "Group stage",
        groupName,
        teamAName: m.teamAName ?? null,
        teamBName: m.teamBName ?? null,
        teamAPlayers: m.teamAPlayers ?? [],
        teamBPlayers: m.teamBPlayers ?? [],
        scoreA: m.scoreA ?? null,
        scoreB: m.scoreB ?? null,
        status: m.status ?? "pending",
        scheduledAt: null,
        startedAt: m.startedAt ?? null,
        courtId: m.courtId ?? null,
        courtName: resolveCourtLabel(m.courtId, courts),
        playOrder: null,
        callStatus:
          m.status === "completed"
            ? ("done" as const)
            : m.status === "in_progress"
              ? ("on_court" as const)
              : ("queued" as const),
      };
    });

  const overviewGroups = (liveData.doubleStage?.groups ?? []) as Array<{
    id?: string;
    name?: string;
    matches?: Array<{
      id: string;
      teamAId?: string | null;
      teamBId?: string | null;
      teamAName?: string | null;
      teamBName?: string | null;
      teamAPlayers?: Array<{ displayName?: string }>;
      teamBPlayers?: Array<{ displayName?: string }>;
      scoreA?: number | null;
      scoreB?: number | null;
      status?: string;
      scheduledAt?: string | null;
      startedAt?: string | null;
      courtId?: string | null;
      playOrder?: number | null;
      callStatus?: string | null;
    }>;
  }>;

  const fromOverview: ScheduleMatchRow[] = overviewGroups.flatMap((g) =>
    (g.matches ?? []).map((m) => ({
      id: m.id,
      kind: "group" as const,
      stageLabel: g.name ? `Group stage · ${g.name}` : "Group stage",
      stageKindLabel: "Group stage",
      groupName: g.name ?? null,
      teamAName: m.teamAName ?? null,
      teamBName: m.teamBName ?? null,
      teamAPlayers: (m.teamAPlayers ?? []).map((p) => p.displayName ?? "").filter(Boolean),
      teamBPlayers: (m.teamBPlayers ?? []).map((p) => p.displayName ?? "").filter(Boolean),
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      status: m.status ?? "pending",
      scheduledAt: m.scheduledAt ?? null,
      startedAt: m.startedAt ?? null,
      courtId: m.courtId ?? null,
      courtName: resolveCourtLabel(m.courtId, courts),
      playOrder: m.playOrder ?? null,
      callStatus:
        m.status === "completed" || m.callStatus === "done"
          ? ("done" as const)
          : m.status === "in_progress" || m.callStatus === "on_court"
            ? ("on_court" as const)
            : m.callStatus === "called"
              ? ("called" as const)
              : parseCallStatus(m.callStatus),
    })),
  );

  const bracketRows: ScheduleMatchRow[] = bracketMatches
    .filter((m) => m.matchNumber !== 999)
    .map((m) => ({
      id: m.id,
      kind: "bracket" as const,
      stageLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      stageKindLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      groupName: null,
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,
      scheduledAt: m.scheduledAt,
      startedAt: m.startedAt,
      courtId: m.courtId,
      courtName: resolveCourtLabel(m.courtId, courts),
      playOrder: m.playOrder,
      callStatus:
        m.status === "completed"
          ? ("done" as const)
          : m.status === "in_progress" || m.callStatus === "on_court"
            ? ("on_court" as const)
            : m.callStatus === "called" || m.callStatus === "on_court" || m.callStatus === "done"
              ? m.callStatus
              : ("queued" as const),
    }));

  const baseGroupRows = fromOverview.length ? fromOverview : groupRows;
  const liveIndex = buildLiveMatchIndex(liveData.matches ?? []);

  const mergedGroupRows = baseGroupRows.map((row) =>
    mergeScheduleRowWithLiveMatch(row, resolveLiveForScheduleRow(row, liveIndex), courts),
  );
  const mergedBracketRows = bracketRows.map((row) =>
    mergeScheduleRowWithLiveMatch(row, resolveLiveForScheduleRow(row, liveIndex), courts),
  );

  return [...mergedGroupRows, ...mergedBracketRows];
}

/**
 * Order-of-Play buckets for venue TV — merges live payload, keeps Now visible while session is live.
 */
export function buildDisplayOrderOfPlayBuckets(
  liveData: DisplayScheduleLiveData,
  options?: { nextCapacity?: number },
): OrderOfPlayBucket[] {
  const rows = mapLiveToDisplayScheduleRows(liveData);
  const buckets = groupMatchesByOrderOfPlay(rows, options);
  const tournamentLive = liveData.tournament.status === "live";
  const liveOnPayload = (liveData.matches ?? []).some((m) =>
    isMatchLiveForTournament(m.status ?? "pending", liveData.tournament.status),
  );

  const nowBucket = buckets.find((b) => b.key === "now");
  if (
    tournamentLive &&
    nowBucket &&
    nowBucket.matches.length === 0 &&
    (liveOnPayload || rows.some((r) => r.status === "in_progress"))
  ) {
    const liveRows = rows.filter(
      (r) =>
        r.status === "in_progress" ||
        r.callStatus === "on_court" ||
        isMatchLiveForTournament(r.status, liveData.tournament.status),
    );
    if (liveRows.length) {
      nowBucket.matches = liveRows;
    }
  }

  return buckets;
}
