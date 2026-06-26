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
    queryKey: ["tournaments", "bracket", sportSlug, slug],
    enabled: canFetch,
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          matches: BracketMatchView[];
          leaderboard: LeaderboardEntry[];
          generated: boolean;
        };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load bracket"));
      }
      return json.data;
    },
    refetchInterval: (query) => {
      const matches = query.state.data?.matches ?? [];
      return matches.some((m) => m.status === "in_progress") ? 5000 : 30000;
    },
  });
}

export function useUpdateBracketLiveScore(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; scoreA: number; scoreB: number }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/live`, {
        method: "PATCH",
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
        throw new Error(extractApiErrorMessage(json, "Could not update live score"));
      }
      return json.data.match;
    },
    onSuccess: (match) => {
      qc.setQueryData(
        ["tournaments", "bracket", sportSlug, slug],
        (prev: { matches: BracketMatchView[]; leaderboard: LeaderboardEntry[]; generated: boolean } | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
          };
        },
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGenerateReclubBracket(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_tournamentId: string) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/bracket/generate`, {
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
      void qc.invalidateQueries({ queryKey: ["tournaments", "bracket", sportSlug, slug] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "lobby", sportSlug, slug] });
      toast.success("Bracket generated — drag squads to seed round one");
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
        ["tournaments", "bracket", sportSlug, slug],
        (prev: { matches: BracketMatchView[]; leaderboard: LeaderboardEntry[]; generated: boolean } | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
          };
        },
      );
      toast.success("Squad placed");
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
      void qc.invalidateQueries({ queryKey: ["tournaments", "bracket", sportSlug, slug] });
      void qc.invalidateQueries({ queryKey: ["reclub", "matches", sportSlug, slug] });
      void qc.invalidateQueries({ queryKey: ["tournaments", "lobby", sportSlug, slug] });
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
