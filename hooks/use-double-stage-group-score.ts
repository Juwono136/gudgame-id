"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
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

async function postGroupScore(
  sportSlug: string,
  slug: string,
  body: Record<string, unknown>,
) {
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
    data?: { match: GroupMatchView; overview?: unknown };
    error?: unknown;
  }>(res);
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, "Failed to update group match"));
  }
  return json.data!.match;
}

function patchGroupMatchInScoringCache(
  prev: ManageScoringPayload | undefined,
  match: GroupMatchView,
): ManageScoringPayload | undefined {
  if (!prev) return prev;
  const patchList = (list: GroupMatchView[] | undefined) =>
    (list ?? []).map((m) => (m.id === match.id ? { ...m, ...match } : m));

  const nextGroups = prev.doubleStage?.groups?.map((g) => ({
    ...g,
    matches: g.matches.map((m) => (m.id === match.id ? { ...m, ...match } : m)),
  }));

  return {
    ...prev,
    groupMatches: patchList(prev.groupMatches),
    activeGroupMatches: patchList(prev.activeGroupMatches),
    doubleStage: prev.doubleStage
      ? {
          ...prev.doubleStage,
          groups: nextGroups ?? prev.doubleStage.groups,
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
    onSuccess: () => {
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
  scoreAction?: "increment" | "decrement" | "set" | "next_game";
  side?: "a" | "b";
  scorerName?: string;
  scorerUserId?: string;
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
          const match = await postGroupScore(sportSlug, slug, {
            action: "update",
            matchId: input.matchId,
            scoreA: input.scoreA,
            scoreB: input.scoreB,
            scoreAction: input.scoreAction ?? "increment",
            side: input.side,
            scorerName: input.scorerName,
            scorerUserId: input.scorerUserId,
          });
          qc.setQueryData(
            manageScoringQueryKey(sportSlug, slug),
            (prev: ManageScoringPayload | undefined) =>
              patchGroupMatchInScoringCache(prev, match),
          );
          return match;
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
    onSuccess: () => {
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
