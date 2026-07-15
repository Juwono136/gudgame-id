"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { LeaderboardEntry } from "@/lib/tournaments/brackets/leaderboard";
import type {
  OfficialTournamentStaffMember,
  OfficialTournamentStaffRole,
} from "@/lib/tournaments/settings";
import { tournamentQueryKeys, invalidateTournamentQueries } from "@/lib/tournaments/query-keys";

type UseTournamentBracketOptions = {
  enabled?: boolean;
};

export function useTournamentBracket(
  sportSlug: string,
  slug: string,
  options?: UseTournamentBracketOptions,
) {
  const canFetch = Boolean(sportSlug && slug) && (options?.enabled ?? true);

  return useQuery({
    queryKey: tournamentQueryKeys.bracket(sportSlug, slug),
    enabled: canFetch,
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          matches: BracketMatchView[];
          leaderboard: LeaderboardEntry[];
          generated: boolean;
          seedingFinalized?: boolean;
        };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load bracket"));
      }
      return json.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const matches = data?.matches ?? [];
      if (matches.some((m) => m.status === "in_progress")) return 3000;
      if (data?.seedingFinalized === false) return 4000;
      if (matches.some((m) => m.status === "pending" || m.status === "bye")) return 8000;
      return 15000;
    },
  });
}

export function useUpdateBracketLiveScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: string;
      scoreA: number;
      scoreB: number;
      action?: "set" | "increment" | "decrement";
      side?: "a" | "b";
      scorerName?: string;
      scorerUserId?: string;
    }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: input.matchId,
          scoreA: input.scoreA,
          scoreB: input.scoreB,
          action: input.action,
          side: input.side,
          scorerName: input.scorerName,
          scorerUserId: input.scorerUserId,
        }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: BracketMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not update live score"));
      }
      return json.data.match;
    },
    onSuccess: (match) => {
      qc.setQueryData(
        tournamentQueryKeys.bracket(sportSlug, slug),
        (prev: { matches: BracketMatchView[]; leaderboard: LeaderboardEntry[]; generated: boolean } | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
          };
        },
      );
      qc.setQueryData(
        ["tournaments", "manage-scoring", sportSlug, slug],
        (prev: import("@/hooks/use-tournament-manage-scoring").ManageScoringPayload | undefined) => {
          if (!prev) return prev;
          const patch = (m: BracketMatchView) => (m.id === match.id ? match : m);
          return {
            ...prev,
            bracketMatches: prev.bracketMatches.map(patch),
            activeBracketMatches: prev.activeBracketMatches.map(patch),
          };
        },
      );
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGenerateReclubBracket(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seedMode: "random" | "manual" = "manual") => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedMode }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { matchCount: number };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not generate bracket"));
      }
      return json.data;
    },
    onSuccess: (_data, seedMode) => {
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success(
        seedMode === "random"
          ? "Bracket generated with random seeding"
          : "Bracket generated — place squads in round one, then save",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAssignBracketTeam(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; slot: "a" | "b"; teamId: string }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: BracketMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not assign squad"));
      }
      return json.data.match;
    },
    onSuccess: (match) => {
      qc.setQueryData(
        tournamentQueryKeys.bracket(sportSlug, slug),
        (prev: { matches: BracketMatchView[]; leaderboard: LeaderboardEntry[]; generated: boolean } | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
            seedingFinalized: false,
          };
        },
      );
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success("Squad placed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGeneratePublicBracket(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seedMode: "random" | "manual" = "manual") => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedMode }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { matchCount: number };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not generate bracket"));
      }
      return json.data;
    },
    onSuccess: (_data, seedMode) => {
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success(
        seedMode === "random"
          ? "Bracket generated with random seeding"
          : "Bracket structure created — assign teams, then save seeding",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFinalizeBracketSeeding(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/finalize`, {
        method: "POST",
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { finalized: boolean };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not save bracket seeding"));
      }
      return json.data;
    },
    onSuccess: () => {
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success("Bracket seeding saved — ready for live scoring");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResetBracket(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/reset`, {
        method: "POST",
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { reset: boolean };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not reset bracket"));
      }
      return json.data;
    },
    onSuccess: () => {
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success("Bracket reset — you can generate again");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRematchBracketMatch(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: BracketMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not rematch bracket slot"));
      }
      return json.data.match;
    },
    onSuccess: () => {
      invalidateTournamentQueries(qc, sportSlug, slug);
      void qc.invalidateQueries({ queryKey: ["reclub", "matches", sportSlug, slug] });
      toast.success("Match reset — ready to play again");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useStartBracketMatchOnCourt(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; courtId: string }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: BracketMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not start match on court"));
      }
      return json.data.match;
    },
    onSuccess: () => {
      invalidateTournamentQueries(qc, sportSlug, slug);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGenerateBracket(tournamentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/host/tournaments/${tournamentId}/bracket/generate`, {
        method: "POST",
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { matchCount: number };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not generate bracket"));
      }
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["host", "tournaments", tournamentId] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "bracket"] });
      toast.success("Bracket generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubmitBracketScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; scoreA: number; scoreB: number }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: input.matchId,
          scoreA: input.scoreA,
          scoreB: input.scoreB,
        }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { match: BracketMatchView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not save score"));
      }
      return json.data;
    },
    onSuccess: () => {
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success("Score saved — session history updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useOfficialTournamentStaff(
  sportSlug: string,
  slug: string,
  options?: UseTournamentBracketOptions,
) {
  const enabled = Boolean(sportSlug && slug) && (options?.enabled ?? true);

  return useQuery({
    queryKey: ["tournaments", "staff", sportSlug, slug],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/staff`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { staff: OfficialTournamentStaffMember[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load scoring staff"));
      }
      return json.data.staff;
    },
  });
}

export function useInviteOfficialTournamentStaff(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: OfficialTournamentStaffRole }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { staff: OfficialTournamentStaffMember[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not invite scoring staff"));
      }
      return json.data.staff;
    },
    onSuccess: (staff) => {
      qc.setQueryData(["tournaments", "staff", sportSlug, slug], staff);
      toast.success("Scoring staff invited");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveOfficialTournamentStaff(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/staff/${userId}`, {
        method: "DELETE",
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { staff: OfficialTournamentStaffMember[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not remove scoring staff"));
      }
      return json.data.staff;
    },
    onSuccess: (staff) => {
      qc.setQueryData(["tournaments", "staff", sportSlug, slug], staff);
      toast.success("Scoring staff removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
