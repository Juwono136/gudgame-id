"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { invalidateSessionContext } from "@/lib/session/invalidate-session-context";
import type { AdminUserListItem, AdminUsersListResult } from "@/lib/admin/users/service";
import type {
  AdminCreateUserInput,
  AdminEditStaffUserInput,
  AdminUsersListQuery,
} from "@/lib/validations/admin-users";

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { error: { code: string; message: string } };

function getErrorMessage(payload: ApiError | unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error
  ) {
    return String(payload.error.message);
  }
  return fallback;
}

export function adminUsersQueryKey(params: Partial<AdminUsersListQuery>) {
  return ["admin", "users", params] as const;
}

export function useAdminUsersList(params: AdminUsersListQuery) {
  return useQuery({
    queryKey: adminUsersQueryKey(params),
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", String(params.page));
      qs.set("pageSize", String(params.pageSize));
      if (params.search) qs.set("search", params.search);
      if (params.role) qs.set("role", params.role);
      qs.set("status", params.status);
      qs.set("sortBy", params.sortBy);
      qs.set("sortDir", params.sortDir);

      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      const json = await parseJsonResponse<ApiSuccess<AdminUsersListResult> | ApiError>(
        res,
      );
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to load users"));
      return (json as ApiSuccess<AdminUsersListResult>).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserStats(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["admin", "users", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/stats");
      const json = await parseJsonResponse<
        ApiSuccess<{
          totalStaff: number;
          activeAccounts: number;
          activeNow: number;
          byRole: Record<string, number>;
        }> | ApiError
      >(res);
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to load stats"));
      return (json as ApiSuccess<{
        totalStaff: number;
        activeAccounts: number;
        activeNow: number;
        byRole: Record<string, number>;
      }>).data;
    },
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        body: formData,
      });
      const json = await parseJsonResponse<
        ApiSuccess<AdminUserListItem & { message?: string }> | ApiError
      >(res);
      if (!res.ok) {
        const err = new Error(getErrorMessage(json, "Failed to create user")) as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        const fieldErrors =
          json &&
          typeof json === "object" &&
          "fieldErrors" in json &&
          json.fieldErrors &&
          typeof json.fieldErrors === "object"
            ? (json.fieldErrors as Record<string, string[]>)
            : undefined;
        if (fieldErrors) err.fieldErrors = fieldErrors;
        throw err;
      }
      return (json as ApiSuccess<AdminUserListItem>).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "host-role-requests"] });
      invalidateSessionContext(qc);
    },
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: AdminEditStaffUserInput;
    }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await parseJsonResponse<ApiSuccess<AdminUserListItem> | ApiError>(
        res,
      );
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to update user"));
      return (json as ApiSuccess<AdminUserListItem>).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "host-role-requests"] });
      invalidateSessionContext(qc);
    },
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await parseJsonResponse<ApiSuccess<{ deleted: boolean }> | ApiError>(
        res,
      );
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to delete user"));
      return (json as ApiSuccess<{ deleted: boolean }>).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      invalidateSessionContext(qc);
    },
  });
}
