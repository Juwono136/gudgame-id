"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage, type ApiErrorBody } from "@/lib/api/extract-api-error";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";

export type AccessInviteView = {
  id: string;
  role: string;
  status: string;
  inviteCode?: string;
  inviteUrl?: string;
  email?: string | null;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  redeemedUserName?: string | null;
  redeemedUserImage?: string | null;
};

export type PlayerInviteView = {
  id: string;
  status: string;
  inviteCode?: string;
  inviteUrl?: string;
  teamId?: string | null;
  expiresAt?: string | null;
  redeemedByUserId?: string | null;
  redeemedByName?: string | null;
  redeemedByImage?: string | null;
  redeemedAt?: string | null;
};

export type InvitePreviewView = {
  kind: "access" | "player";
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  slug: string;
  role?: string;
  roleLabel?: string;
  expiresAt: string;
};

function accessKey(sportSlug: string, slug: string) {
  return tournamentQueryKeys.accessInvites(sportSlug, slug);
}

function playerKey(sportSlug: string, slug: string) {
  return tournamentQueryKeys.playerInvites(sportSlug, slug);
}

export function useAccessInvites(sportSlug: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: accessKey(sportSlug, slug),
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/access-invites`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { invites: AccessInviteView[] };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Failed to load invites"));
      }
      return json.data.invites;
    },
    enabled: enabled && Boolean(sportSlug && slug),
  });
}

export function useCreateAccessInvite(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { role: "scorekeeper" | "bracket_manager" }) => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/access-invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { invite: AccessInviteView };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Failed to create invite"));
      }
      return json.data.invite;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKey(sportSlug, slug) });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRevokeAccessInvite(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/access-invites?inviteId=${encodeURIComponent(inviteId)}`,
        { method: "DELETE" },
      );
      const json = await parseJsonResponse<{ success: boolean }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Failed to revoke invite"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessKey(sportSlug, slug) });
      toast.success("Staff invite updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRevealAccessInvite(sportSlug: string, slug: string) {
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/access-invites/reveal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId }),
        },
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: { credentials: { inviteUrl: string; inviteCode: string } };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Could not load invite details"));
      }
      return json.data.credentials;
    },
  });
}

export function usePlayerInvites(sportSlug: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: playerKey(sportSlug, slug),
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/player-invites`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { invites: PlayerInviteView[] };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Failed to load player invites"));
      }
      return json.data.invites;
    },
    enabled: enabled && Boolean(sportSlug && slug),
  });
}

export function useCreatePlayerInvite(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { teamId?: string | null }) => {
      const body = input.teamId ? { teamId: input.teamId } : {};
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/player-invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { invite: PlayerInviteView };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Failed to create player invite"));
      }
      return json.data.invite;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: playerKey(sportSlug, slug) });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRevokePlayerInvite(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/player-invites?inviteId=${encodeURIComponent(inviteId)}`,
        { method: "DELETE" },
      );
      const json = await parseJsonResponse<{ success: boolean }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Failed to remove invite"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: playerKey(sportSlug, slug) });
      toast.success("Player invite removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePreviewInvite() {
  return useMutation({
    mutationFn: async (input: {
      token?: string;
      code?: string;
      tournamentId?: string;
      kind: "access" | "player";
    }) => {
      const res = await fetch("/api/tournaments/invites/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { preview: InvitePreviewView };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Could not verify invite"));
      }
      return json.data.preview;
    },
  });
}

export function useRedeemInvite() {
  return useMutation({
    mutationFn: async (input: {
      token?: string;
      code?: string;
      tournamentId?: string;
      kind: "access" | "player";
    }) => {
      const res = await fetch("/api/tournaments/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { kind: string; tournamentId?: string; teamId?: string | null };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Failed to redeem invite"));
      }
      return json.data;
    },
  });
}
