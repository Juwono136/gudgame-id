"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

export type LobbyPayload = {
  tournament: {
    id: string;
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
  activeMatches?: ReclubMatchView[];
  courts?: import("@/hooks/use-tournament-courts").TournamentCourtView[];
  userTeamId: string | null;
  canManage: boolean;
  participant: TournamentParticipantContext;
  teamsInActiveBracket: string[];
  isAuthenticated: boolean;
  userId: string | null;
};

import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";
import { softDevPollMs } from "@/lib/dev/soft-poll";

function lobbyKey(sportSlug: string, slug: string) {
  return tournamentQueryKeys.lobby(sportSlug, slug);
}

function invalidateLobbyAndLive(
  qc: ReturnType<typeof useQueryClient>,
  sportSlug: string,
  slug: string,
) {
  void qc.invalidateQueries({ queryKey: lobbyKey(sportSlug, slug) });
  void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
  void qc.invalidateQueries({ queryKey: ["tournaments", "manage-scoring", sportSlug, slug] });
}

export function useTournamentLobby(sportSlug: string, slug: string, enabled = true) {
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
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.activeMatches?.length || data?.activeMatch) return softDevPollMs(5000);
      return softDevPollMs(15000);
    },
  });
}

export function useSwitchTeam(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
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
      invalidateLobbyAndLive(qc, sportSlug, slug);
      toast.success("Team updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useStartReclubRound(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      teamAId: string;
      teamBId: string;
      courtId?: string;
      playType?: "round" | "friendly";
      bracketMatchId?: string;
      sessionRound?: number;
      americanoPairing?: {
        sideA: [string, string];
        sideB: [string, string];
      };
    }) => {
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
    onSuccess: (_data, input) => {
      invalidateLobbyAndLive(qc, sportSlug, slug);
      toast.success(input.playType === "friendly" ? "Friendly game started!" : "Round started!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useHostMovePlayer(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { teamId: string; userId: string }) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/teams/${input.teamId}/members/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: input.userId }),
        },
      );
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not move player"));
      }
    },
    onSuccess: () => {
      invalidateLobbyAndLive(qc, sportSlug, slug);
      toast.success("Player moved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRenameReclubTeam(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { teamId: string; name: string }) => {
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
      invalidateLobbyAndLive(qc, sportSlug, slug);
      toast.success("Squad renamed");
    },
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
      invalidateLobbyAndLive(qc, sportSlug, slug);
      toast.success("Squad created!");
    },
  });
}

export function useUpdateReclubLiveScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: string;
      scoreA: number;
      scoreB: number;
      action?: "set" | "increment" | "decrement" | "set_points" | "next_game";
      side?: "a" | "b";
      scorerName?: string;
      scorerUserId?: string;
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
        const activeMatches = (prev.activeMatches ?? []).map((m) =>
          m.id === match.id ? match : m,
        );
        return {
          ...prev,
          activeMatch: prev.activeMatch?.id === match.id ? match : prev.activeMatch,
          activeMatches,
          matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
        };
      });
      qc.setQueryData(
        ["tournaments", "manage-scoring", sportSlug, slug],
        (prev: import("@/hooks/use-tournament-manage-scoring").ManageScoringPayload | undefined) => {
          if (!prev) return prev;
          const patchMatch = (m: ReclubMatchView) => (m.id === match.id ? match : m);
          return {
            ...prev,
            activeReclubMatches: prev.activeReclubMatches.map(patchMatch),
            reclubMatches: prev.reclubMatches.map(patchMatch),
          };
        },
      );
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
    },
    onError: (err: Error) => toast.error(err.message),
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
      invalidateLobbyAndLive(qc, sportSlug, slug);
      toast.success("You left the session");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCompleteReclubRound(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: string;
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
    onSuccess: (match) => {
      invalidateLobbyAndLive(qc, sportSlug, slug);
      qc.setQueryData(
        ["tournaments", "manage-scoring", sportSlug, slug],
        (prev: import("@/hooks/use-tournament-manage-scoring").ManageScoringPayload | undefined) => {
          if (!prev) return prev;
          const activeReclubMatches = prev.activeReclubMatches.filter((m) => m.id !== match.id);
          const reclubMatches = prev.reclubMatches.map((m) => (m.id === match.id ? match : m));
          const hasMatch = prev.reclubMatches.some((m) => m.id === match.id);
          return {
            ...prev,
            activeReclubMatches,
            reclubMatches: hasMatch ? reclubMatches : [match, ...prev.reclubMatches],
          };
        },
      );
      void qc.invalidateQueries({ queryKey: ["tournaments", "manage-scoring", sportSlug, slug] });
      toast.success("Match finalized — stats updated on the public page");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
