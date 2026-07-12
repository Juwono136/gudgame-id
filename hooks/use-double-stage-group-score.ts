"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import { invalidateTournamentQueries } from "@/lib/tournaments/query-keys";

function manageScoringQueryKey(sportSlug: string, slug: string) {
  return ["tournaments", "manage-scoring", sportSlug, slug] as const;
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
    data?: { match: GroupMatchView };
    error?: unknown;
  }>(res);
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, "Failed to update group match"));
  }
  return json.data!.match;
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
      void invalidateTournamentQueries(qc, sportSlug, slug);
      void qc.invalidateQueries({
        queryKey: manageScoringQueryKey(sportSlug, slug),
      });
    },
  });
}

export function useUpdateGroupLiveScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: string;
      scoreA: number;
      scoreB: number;
      scoreAction?: "increment" | "decrement" | "set";
      side?: "a" | "b";
      scorerName?: string;
      scorerUserId?: string;
    }) =>
      postGroupScore(sportSlug, slug, {
        action: "update",
        matchId: input.matchId,
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        scoreAction: input.scoreAction,
        side: input.side,
        scorerName: input.scorerName,
        scorerUserId: input.scorerUserId,
      }),
    onSuccess: () => {
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
    }) =>
      postGroupScore(sportSlug, slug, {
        action: "record",
        matchId: input.matchId,
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        durationSeconds: input.durationSeconds,
      }),
    onSuccess: () => {
      void invalidateTournamentQueries(qc, sportSlug, slug);
      void qc.invalidateQueries({
        queryKey: manageScoringQueryKey(sportSlug, slug),
      });
    },
  });
}
