"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { NotificationId, NotificationItem } from "@/lib/notifications/types";

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count");
      const json = await parseJsonResponse<{
        success: boolean;
        data: { count: number };
        error?: unknown;
      }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json as never, "Failed to load notifications"));
      return json.data.count;
    },
    enabled,
    refetchInterval: 30000,
  });
}

export function useRecentNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=5&offset=0");
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: NotificationItem[]; total: number };
        error?: unknown;
      }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json as never, "Failed to load notifications"));
      return json.data;
    },
    enabled,
  });
}

export function useNotificationsSearch(search: string, enabled: boolean) {
  const debouncedSearch = useDebouncedValue(search, 300);

  return useInfiniteQuery({
    queryKey: ["notifications", "all", debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: "20",
        offset: String(pageParam),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/notifications?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: NotificationItem[]; total: number };
        error?: unknown;
      }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json as never, "Failed to load notifications"));
      return json.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: NotificationId) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      const json = await parseJsonResponse(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json as never, "Could not mark as read"));
      return json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      const json = await parseJsonResponse(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json as never, "Could not mark all as read"));
      return json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
