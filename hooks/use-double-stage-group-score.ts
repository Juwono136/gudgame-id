"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type {
  DoubleStageOverview,
  GroupMatchView,
} from "@/lib/tournaments/double-stage/service";
import type { ManageScoringPayload } from "@/hooks/use-tournament-manage-scoring";
import {
  invalidateTournamentQueries,
  tournamentQueryKeys,
} from "@/lib/tournaments/query-keys";

function manageScoringQueryKey(sportSlug: string, slug: string) {
  return ["tournaments", "manage-scoring", sportSlug, slug] as const;
}

/** Matches with an in-flight score write — used to pause polling and avoid stale overwrites. */
const scoringInFlight = new Set<string>();

export function isGroupScoreUpdateInFlight(matchId?: string): boolean {
  if (matchId) return scoringInFlight.has(matchId);
  return scoringInFlight.size > 0;
}

export function isManageScoringWriteInFlight(sportSlug: string, slug: string): boolean {
  const prefix = `${sportSlug}/${slug}:`;
  for (const key of scoringInFlight) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/** Serialize live score updates per match so rapid +/- never overwrite each other. */
const groupScoreQueues = new Map<string, Promise<unknown>>();

export function enqueueGroupScoreUpdate<T>(
  matchId: string,
  task: () => Promise<T>,
): Promise<T> {
  const prev = groupScoreQueues.get(matchId) ?? Promise.resolve();
  const next = prev.then(task, task);
  groupScoreQueues.set(
    matchId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

type GroupScoreWriteResult = {
  match: GroupMatchView;
  overview?: DoubleStageOverview | null;
};

async function postGroupScore(
  sportSlug: string,
  slug: string,
  body: Record<string, unknown>,
): Promise<GroupScoreWriteResult> {
  const res = await fetch(
    `/api/tournaments/${sportSlug}/${slug}/manage/double-stage/score`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json = await parseJsonResponse<{
    success: boolean;
    data?: { match: GroupMatchView; overview?: DoubleStageOverview | null };
    error?: unknown;
  }>(res);
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, "Failed to update group match"));
  }
  return {
    match: json.data!.match,
    overview: json.data?.overview ?? null,
  };
}

function upsertMatch(list: GroupMatchView[] | undefined, match: GroupMatchView) {
  const rows = list ?? [];
  const idx = rows.findIndex((m) => m.id === match.id);
  if (idx === -1) return [...rows, match];
  const next = [...rows];
  next[idx] = { ...next[idx], ...match };
  return next;
}

function removeMatch(list: GroupMatchView[] | undefined, matchId: string) {
  return (list ?? []).filter((m) => m.id !== matchId);
}

function patchGroupMatchInScoringCache(
  prev: ManageScoringPayload | undefined,
  match: GroupMatchView,
  overview?: DoubleStageOverview | null,
): ManageScoringPayload | undefined {
  if (!prev) return prev;

  const nextGroupMatches = upsertMatch(prev.groupMatches, match);
  let nextActive = upsertMatch(prev.activeGroupMatches, match);
  if (match.status === "in_progress") {
    nextActive = upsertMatch(nextActive, match);
  } else if (match.status === "completed" || match.status === "pending") {
    nextActive = removeMatch(nextActive, match.id);
  }

  const baseDoubleStage = overview ?? prev.doubleStage;
  const nextGroups =
    overview?.groups ??
    prev.doubleStage?.groups?.map((g) => ({
      ...g,
      matches: g.matches.map((m) => (m.id === match.id ? { ...m, ...match } : m)),
    }));

  return {
    ...prev,
    groupMatches: nextGroupMatches,
    activeGroupMatches: nextActive.filter((m) => m.status === "in_progress"),
    doubleStage: baseDoubleStage
      ? {
          ...baseDoubleStage,
          groups: nextGroups ?? baseDoubleStage.groups,
        }
      : prev.doubleStage,
  };
}

export function useStartGroupMatchOnCourt(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; courtId: string }) =>
      postGroupScore(sportSlug, slug, {
        action: "start",
        matchId: input.matchId,
        courtId: input.courtId,
      }),
    onSuccess: (data) => {
      qc.setQueryData(
        manageScoringQueryKey(sportSlug, slug),
        (prev: ManageScoringPayload | undefined) =>
          patchGroupMatchInScoringCache(prev, data.match, data.overview),
      );
      void qc.invalidateQueries({
        queryKey: manageScoringQueryKey(sportSlug, slug),
      });
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export type GroupLiveScoreInput = {
  matchId: string;
  scoreA: number;
  scoreB: number;
  scoreAction?: "increment" | "decrement" | "set" | "set_points" | "next_game";
  side?: "a" | "b";
  targetPoints?: number;
  scorerName?: string;
  scorerUserId?: string;
  servingSide?: "a" | "b";
  serverName?: string;
  serverUserId?: string;
};

export function useUpdateGroupLiveScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GroupLiveScoreInput) => {
      const flightKey = `${sportSlug}/${slug}:${input.matchId}`;
      return enqueueGroupScoreUpdate(input.matchId, async () => {
        scoringInFlight.add(flightKey);
        try {
          await qc.cancelQueries({ queryKey: manageScoringQueryKey(sportSlug, slug) });
          const data = await postGroupScore(sportSlug, slug, {
            action: "update",
            matchId: input.matchId,
            scoreA: input.scoreA,
            scoreB: input.scoreB,
            scoreAction: input.scoreAction ?? "increment",
            side: input.side,
            targetPoints: input.targetPoints,
            scorerName: input.scorerName,
            scorerUserId: input.scorerUserId,
            servingSide: input.servingSide,
            serverName: input.serverName,
            serverUserId: input.serverUserId,
          });
          qc.setQueryData(
            manageScoringQueryKey(sportSlug, slug),
            (prev: ManageScoringPayload | undefined) =>
              patchGroupMatchInScoringCache(prev, data.match, data.overview),
          );
          return data.match;
        } finally {
          scoringInFlight.delete(flightKey);
        }
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      void qc.invalidateQueries({
        queryKey: manageScoringQueryKey(sportSlug, slug),
      });
    },
  });
}

export function useFinalizeGroupScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: string;
      scoreA: number;
      scoreB: number;
      durationSeconds?: number;
    }) => {
      const flightKey = `${sportSlug}/${slug}:${input.matchId}`;
      return enqueueGroupScoreUpdate(input.matchId, async () => {
        scoringInFlight.add(flightKey);
        try {
          return await postGroupScore(sportSlug, slug, {
            action: "record",
            matchId: input.matchId,
            scoreA: input.scoreA,
            scoreB: input.scoreB,
            durationSeconds: input.durationSeconds,
          });
        } finally {
          scoringInFlight.delete(flightKey);
        }
      });
    },
    onSuccess: (data) => {
      qc.setQueryData(
        manageScoringQueryKey(sportSlug, slug),
        (prev: ManageScoringPayload | undefined) =>
          patchGroupMatchInScoringCache(prev, data.match, data.overview),
      );
      invalidateTournamentQueries(qc, sportSlug, slug);
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      void qc.invalidateQueries({
        queryKey: manageScoringQueryKey(sportSlug, slug),
      });
    },
  });
}
