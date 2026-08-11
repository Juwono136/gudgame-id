"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { invalidateSessionContext } from "@/lib/session/invalidate-session-context";
import type { HostRoleRequestStatus } from "@/lib/host-role-requests/constants";
import type {
  HostRoleRequestAdminItem,
  HostRoleRequestPublic,
} from "@/lib/host-role-requests/types";
import type { AppRole } from "@/lib/roles/constants";

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
    return String((payload.error as { message: string }).message);
  }
  return fallback;
}

export type HostRoleRequestState = {
  hasHostRole: boolean;
  roles: AppRole[];
  request: HostRoleRequestPublic | null;
};

export const hostRoleRequestQueryKey = ["account", "host-role-request"] as const;

export function useHostRoleRequestState(enabled = true) {
  return useQuery({
    enabled,
    queryKey: hostRoleRequestQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/account/host-role-request", {
        cache: "no-store",
      });
      const json = await parseJsonResponse<ApiSuccess<HostRoleRequestState> | ApiError>(res);
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to load Host role request"));
      return (json as ApiSuccess<HostRoleRequestState>).data;
    },
    staleTime: 0,
    gcTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useCreateHostRoleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch("/api/account/host-role-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await parseJsonResponse<
        ApiSuccess<{ request: HostRoleRequestPublic }> | ApiError
      >(res);
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to submit request"));
      return (json as ApiSuccess<{ request: HostRoleRequestPublic }>).data.request;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: hostRoleRequestQueryKey });
    },
  });
}

export function useCancelHostRoleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/host-role-request", { method: "DELETE" });
      const json = await parseJsonResponse<
        ApiSuccess<{ request: HostRoleRequestPublic }> | ApiError
      >(res);
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to cancel request"));
      return (json as ApiSuccess<{ request: HostRoleRequestPublic }>).data.request;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: hostRoleRequestQueryKey });
    },
  });
}

export type AdminHostRoleRequestItem = HostRoleRequestAdminItem;

export type AdminHostRoleRequestsResult = {
  items: HostRoleRequestAdminItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pendingCount: number;
  statusCounts: Record<HostRoleRequestStatus, number>;
};

export function adminHostRoleRequestsQueryKey(params: {
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return ["admin", "host-role-requests", params] as const;
}

export function useAdminHostRoleRequests(params: {
  status: string;
  search: string;
  page: number;
  pageSize?: number;
}) {
  const pageSize = params.pageSize ?? 10;
  return useQuery({
    queryKey: adminHostRoleRequestsQueryKey({
      status: params.status,
      search: params.search,
      page: params.page,
      pageSize,
    }),
    queryFn: async () => {
      const qs = new URLSearchParams({
        status: params.status,
        search: params.search,
        page: String(params.page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/admin/host-role-requests?${qs}`);
      const json = await parseJsonResponse<
        ApiSuccess<AdminHostRoleRequestsResult> | ApiError
      >(res);
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to load requests"));
      return (json as ApiSuccess<AdminHostRoleRequestsResult>).data;
    },
    placeholderData: (prev) => prev,
  });
}

async function invalidateAdminHostAndUsers(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "host-role-requests"] }),
    qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  ]);
}

export function useApproveHostRoleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/admin/host-role-requests/${requestId}/approve`, {
        method: "POST",
      });
      const json = await parseJsonResponse<
        ApiSuccess<{ request: HostRoleRequestPublic }> | ApiError
      >(res);
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to approve request"));
      return (json as ApiSuccess<{ request: HostRoleRequestPublic }>).data.request;
    },
    onSuccess: async () => {
      await invalidateAdminHostAndUsers(qc);
      invalidateSessionContext(qc);
    },
  });
}

export function useRejectHostRoleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; rejectionReason: string }) => {
      const res = await fetch(`/api/admin/host-role-requests/${input.requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: input.rejectionReason }),
      });
      const json = await parseJsonResponse<
        ApiSuccess<{ request: HostRoleRequestPublic }> | ApiError
      >(res);
      if (!res.ok) throw new Error(getErrorMessage(json, "Failed to reject request"));
      return (json as ApiSuccess<{ request: HostRoleRequestPublic }>).data.request;
    },
    onSuccess: async () => {
      await invalidateAdminHostAndUsers(qc);
    },
  });
}
