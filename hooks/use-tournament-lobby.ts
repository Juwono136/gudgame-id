"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

export type LobbyPayload = {
  tournament: {
    id: number;
    sportSlug: string;
    slug: string;
    name: string;
    status: string;
    playersPerTeam: number;
    maxTeams: number | null;
  };
  summary: TournamentRegistrationSummary;
  teams: LobbyTeamView[];
  matches: ReclubMatchView[];
  activeMatch: ReclubMatchView | null;
  userTeamId: number | null;
  canManage: boolean;
  isAuthenticated: boolean;
  userId: string | null;
};

function lobbyKey(sportSlug: string, slug: string) {
  return ["tournaments", "lobby", sportSlug, slug] as const;
}

export function useTournamentLobby(sportSlug: string, slug: string) {
  return useQuery({
    queryKey: lobbyKey(sportSlug, slug),
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/lobby`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: LobbyPayload;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load lobby"));
      }
      return json.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.activeMatch) return 5000;
      return 15000;
    },
  });
}

export function useSwitchTeam(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: number) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/teams/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not switch team"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lobbyKey(sportSlug, slug) });
      toast.success("Team updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useStartReclubRound(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { teamAId: number; teamBId: number }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/matches/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: ReclubMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not start round"));
      }
      return json.data.match;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lobbyKey(sportSlug, slug) });
      toast.success("Round started!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRenameReclubTeam(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { teamId: number; name: string }) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/teams/${input.teamId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: input.name }),
        },
      );
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not rename squad"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lobbyKey(sportSlug, slug) });
      toast.success("Squad renamed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateReclubTeam(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamName: string) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/teams/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName }),
      });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not create team"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lobbyKey(sportSlug, slug) });
      toast.success("Squad created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateReclubLiveScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: number;
      scoreA: number;
      scoreB: number;
      action?: "set" | "increment" | "decrement";
      side?: "a" | "b";
    }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/matches/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: ReclubMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not sync score"));
      }
      return json.data.match;
    },
    onSuccess: (match) => {
      qc.setQueryData<LobbyPayload>(lobbyKey(sportSlug, slug), (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeMatch: match,
          matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
        };
      });
    },
  });
}

export function useLeaveReclubTournament(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/leave`, {
        method: "POST",
      });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not leave session"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lobbyKey(sportSlug, slug) });
      toast.success("You left the session");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCompleteReclubRound(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: number;
      scoreA: number;
      scoreB: number;
      durationSeconds: number;
      summary?: string;
    }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/matches/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: ReclubMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not complete round"));
      }
      return json.data.match;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lobbyKey(sportSlug, slug) });
      toast.success("Round completed — scores saved to player history");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
