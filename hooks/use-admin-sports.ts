"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { SportId } from "@/lib/domain/sports";
import type { AdminSportsListResult, SportDetail } from "@/lib/sports/service";
import type { AdminSportsListQuery } from "@/lib/validations/sports-admin";

export type SportFormPayload = FormData;

export function useAdminSportsList(query: AdminSportsListQuery) {
  const params = new URLSearchParams({ view: "manage" });
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  params.set("visibility", query.visibility);
  params.set("status", query.status);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);

  return useQuery({
    queryKey: ["admin", "sports", "manage", query],
    queryFn: async () => {
      const res = await fetch(`/api/admin/sports?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: AdminSportsListResult;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load sports"));
      }
      return json.data;
    },
  });
}

export function useAdminSport(id: SportId | null) {
  return useQuery({
    queryKey: ["admin", "sport", id],
    enabled: id != null && id.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/admin/sports/${id}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { sport: SportDetail };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load sport"));
      }
      return json.data.sport;
    },
  });
}

export function useCreateAdminSport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: SportFormPayload) => {
      const res = await fetch("/api/admin/sports", {
        method: "POST",
        body: formData,
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { sport: SportDetail };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to create sport"));
      }
      return json.data.sport;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "sports"] });
      toast.success("Sport created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateAdminSport(id: SportId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: SportFormPayload) => {
      const res = await fetch(`/api/admin/sports/${id}`, {
        method: "PATCH",
        body: formData,
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { sport: SportDetail };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to update sport"));
      }
      return json.data.sport;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "sports"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sport", id] });
      toast.success("Sport updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAdminSport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: SportId) => {
      const res = await fetch(`/api/admin/sports/${id}`, { method: "DELETE" });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to delete sport"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "sports"] });
      toast.success("Sport permanently deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReorderAdminSports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: SportId[]) => {
      const res = await fetch("/api/admin/sports/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to reorder sports"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "sports"] });
      toast.success("Sport order updated", { id: "sport-reorder" });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
