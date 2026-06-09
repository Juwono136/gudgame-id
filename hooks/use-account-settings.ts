"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { AccountSettingsView } from "@/lib/account/settings/get-settings";
import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";

type ApiSuccess<T> = { success: true; data: T };

export function useAccountSettings() {
  return useQuery({
    queryKey: ["account", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/account/settings");
      const json = await parseJsonResponse<ApiSuccess<AccountSettingsView>>(res);
      if (!res.ok) throw new Error("Failed to load settings");
      return json.data;
    },
  });
}

export function useUpdateStaffProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/account/settings/profile", {
        method: "PATCH",
        body: formData,
      });
      const json = await parseJsonResponse<ApiSuccess<{ message: string }> & { error?: string; fieldErrors?: Record<string, string[]> }>(res);
      if (!res.ok) {
        const err = new Error(json.error ?? "Could not update profile") as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        err.fieldErrors = json.fieldErrors;
        throw err;
      }
      return json.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["session", "context"] });
    },
  });
}

export function useSetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { password: string; confirmPassword: string }) => {
      const res = await fetch("/api/account/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseJsonResponse<ApiSuccess<{ message: string }> & { error?: string }>(
        res,
      );
      if (!res.ok) throw new Error(json.error ?? "Could not create password");
      return json.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["session", "context"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: {
      currentPassword: string;
      password: string;
      confirmPassword: string;
    }) => {
      const res = await fetch("/api/account/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseJsonResponse<ApiSuccess<{ message: string }> & { error?: string; fieldErrors?: Record<string, string[]> }>(res);
      if (!res.ok) {
        const err = new Error(json.error ?? "Could not change password") as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        err.fieldErrors = json.fieldErrors;
        throw err;
      }
      return json.data;
    },
  });
}

export function useSavePlayerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formData,
      create,
    }: {
      formData: FormData;
      create: boolean;
    }) => {
      const res = await fetch("/api/account/settings/player", {
        method: create ? "POST" : "PATCH",
        body: formData,
      });
      const json = await parseJsonResponse<
        ApiSuccess<{ profile: PlayerWikiProfileView; message: string }> & {
          error?: string;
          fieldErrors?: Record<string, string[]>;
        }
      >(res);
      if (!res.ok) {
        const err = new Error(json.error ?? "Could not save player profile") as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        err.fieldErrors = json.fieldErrors;
        throw err;
      }
      return json.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account", "settings"] });
    },
  });
}
