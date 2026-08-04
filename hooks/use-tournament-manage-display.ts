"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type {
  TournamentDisplayBrandTheme,
  TournamentDisplayConfig,
  TournamentDisplayLayout,
} from "@/lib/tournaments/settings";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";

export type DisplayConfigInput = {
  layout: TournamentDisplayLayout;
  autoRotate?: boolean;
  rotationIntervalSec?: number;
  rotationLayouts?: TournamentDisplayLayout[];
  brandTheme?: TournamentDisplayBrandTheme;
};

export function useUpdateTournamentDisplayConfig(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DisplayConfigInput) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/manage/display`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { displayConfig: TournamentDisplayConfig };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not save display settings"));
      }
      return json.data.displayConfig;
    },
    onSuccess: async (displayConfig) => {
      // Push into live cache immediately so public/TV UIs pick up brand theme without waiting for poll.
      qc.setQueriesData(
        { queryKey: tournamentQueryKeys.live(sportSlug, slug) },
        (prev: unknown) => {
          if (!prev || typeof prev !== "object") return prev;
          return { ...(prev as Record<string, unknown>), displayConfig };
        },
      );
      await qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
      void qc.invalidateQueries({ queryKey: ["tournaments", "manage-detail", sportSlug, slug] });
      toast.success("Display settings saved — venue screens update automatically");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveTournamentParticipant(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/manage/participants/remove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not remove player"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tournaments", sportSlug, slug, "participants"] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "player-invites", sportSlug, slug] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "manage-scoring", sportSlug, slug] });
      toast.success("Player removed from tournament");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveTournamentTeam(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/manage/participants/remove-team`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        },
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data?: { teamName?: string; removedPlayers?: number };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not remove team"));
      }
      return json.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["tournaments", sportSlug, slug, "participants"] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "player-invites", sportSlug, slug] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "manage-scoring", sportSlug, slug] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "manage-detail", sportSlug, slug] });
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
      const name = data?.teamName?.trim();
      toast.success(
        name
          ? `Removed ${name}${data?.removedPlayers != null ? ` (${data.removedPlayers} players)` : ""}`
          : "Team removed from tournament",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
