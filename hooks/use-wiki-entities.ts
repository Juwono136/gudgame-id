"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { adminRoutes } from "@/lib/constants/routes";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";
import type { WikiEntityDetail } from "@/lib/wiki/service";
import type { WikiEntityId } from "@/lib/domain/wiki";
import type {
  WikiEntitiesListQuery,
  WikiEntityUpsertInput,
} from "@/lib/validations/wiki-entities";
import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import type { GallerySlot } from "@/components/admin/wiki/gallery-upload-field";

function clientImageUrl(url: string | undefined): string | undefined {
  if (!url?.trim() || url.startsWith("blob:")) return undefined;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/api/media/")
  ) {
    return url;
  }
  return undefined;
}

function buildWikiFormData(
  data: WikiEntityUpsertInput,
  files?: {
    heroImage?: File | null;
    primaryImage?: File | null;
    gallerySlots?: GallerySlot[];
    equipmentFiles?: Record<string, File>;
    clearPrimaryImage?: boolean;
    clearHeroImage?: boolean;
  },
  options?: { sportSlug?: string },
): FormData {
  const fd = new FormData();
  if (options?.sportSlug) fd.append("sportSlug", options.sportSlug);
  fd.append("entityType", data.entityType);
  fd.append("displayName", data.displayName);
  if (data.nickname) fd.append("nickname", data.nickname);
  if (data.slug) fd.append("slug", data.slug);
  if (data.summary) fd.append("summary", data.summary);
  if (data.biography) fd.append("biography", data.biography);
  fd.append("status", data.status);
  fd.append("attributes", JSON.stringify(data.attributes));
  fd.append("performance", JSON.stringify(data.performance));
  fd.append("specs", JSON.stringify(data.specs));
  fd.append("features", JSON.stringify(data.features));
  fd.append("sourceType", data.sourceType);
  if (data.sourceUrl) fd.append("sourceUrl", data.sourceUrl);
  fd.append("relations", JSON.stringify(data.relations));
  fd.append("gallery", JSON.stringify(data.gallery));
  const heroUrl = clientImageUrl(data.heroImageUrl);
  const primaryUrl = clientImageUrl(data.primaryImageUrl);
  if (heroUrl) fd.append("heroImageUrl", heroUrl);
  if (primaryUrl) fd.append("primaryImageUrl", primaryUrl);
  if (files?.heroImage) fd.append("heroImage", files.heroImage);
  if (files?.primaryImage) fd.append("primaryImage", files.primaryImage);
  if (files?.clearPrimaryImage) fd.append("clearPrimaryImage", "true");
  if (files?.clearHeroImage) fd.append("clearHeroImage", "true");
  for (const slot of files?.gallerySlots ?? []) {
    if (slot.file) fd.append("galleryImages", slot.file);
  }
  for (const [id, file] of Object.entries(files?.equipmentFiles ?? {})) {
    fd.append(`equipmentImage_${id}`, file);
  }
  return fd;
}

export function useWikiEntitiesList(query: WikiEntitiesListQuery, sportSlug: string) {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.entityType) params.set("entityType", query.entityType);
  if (query.status) params.set("status", query.status);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);

  return useQuery({
    queryKey: ["admin", "wiki-entities", sportSlug, query],
    queryFn: async () => {
      const res = await fetch(`/api/admin/wiki-entities?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          items: WikiDirectoryListItem[];
          total: number;
          page: number;
          pageSize: number;
          stats: {
            player: number;
            gear: number;
            published: number;
            draft: number;
            wikiDraft: number;
            tournaments: number;
            tournamentsLive?: number;
            tournamentsUpcoming?: number;
          };
          sportSlug: string;
        };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load wiki entities"));
      }
      return json.data;
    },
  });
}

export function useWikiEntity(id: WikiEntityId | null) {
  return useQuery({
    queryKey: ["admin", "wiki-entity", id],
    enabled: id != null && id.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/admin/wiki-entities/${id}`);
      const json = await parseJsonResponse<{ success: boolean; data: WikiEntityDetail; error?: unknown }>(
        res,
      );
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load entity"));
      }
      return json.data;
    },
  });
}

export function useScrapeWikiGear(sportSlug: string) {
  return useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/admin/wiki-entities/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sportSlug }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: WikiScrapePreview;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Scrape failed"));
      }
      return json.data;
    },
    onError: (e: Error) => {
      toast.error("Could not import from URL", { description: e.message });
    },
  });
}

export function useCreateWikiEntity() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      data,
      files,
      skipRedirect,
      sportSlug,
    }: {
      data: WikiEntityUpsertInput;
      files?: {
        heroImage?: File | null;
        primaryImage?: File | null;
        gallerySlots?: GallerySlot[];
        clearPrimaryImage?: boolean;
        clearHeroImage?: boolean;
      };
      skipRedirect?: boolean;
      sportSlug: string;
    }) => {
      const res = await fetch("/api/admin/wiki-entities", {
        method: "POST",
        body: buildWikiFormData(data, files, { sportSlug }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: WikiEntityDetail;
        error?: unknown;
        fieldErrors?: Record<string, string[]>;
      }>(res);
      if (!res.ok) {
        const err = new Error(extractApiErrorMessage(json, "Create failed")) as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        err.fieldErrors = json.fieldErrors;
        throw err;
      }
      return { entity: json.data, skipRedirect: skipRedirect ?? false };
    },
    onSuccess: ({ entity, skipRedirect }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      if (!skipRedirect) {
        toast.success("Wiki entity created", { description: entity.displayName });
        router.push(`${adminRoutes.wikiEntities}/${entity.id}/edit`);
      }
    },
    onError: (e: Error & { fieldErrors?: Record<string, string[]> }) => {
      const fields = e.fieldErrors
        ? Object.entries(e.fieldErrors)
            .map(([k, v]) => `${k}: ${v?.join(", ")}`)
            .join(" · ")
        : null;
      toast.error("Create failed", {
        description: fields ? `${e.message} (${fields})` : e.message,
      });
    },
  });
}

export function useUpdateWikiEntity(id: WikiEntityId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      files,
      sportSlug,
    }: {
      data: WikiEntityUpsertInput;
      files?: {
        heroImage?: File | null;
        primaryImage?: File | null;
        gallerySlots?: GallerySlot[];
        clearPrimaryImage?: boolean;
        clearHeroImage?: boolean;
      };
      sportSlug: string;
    }) => {
      const res = await fetch(`/api/admin/wiki-entities/${id}`, {
        method: "PATCH",
        body: buildWikiFormData(data, files, { sportSlug }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: WikiEntityDetail;
        error?: unknown;
        fieldErrors?: Record<string, string[]>;
      }>(res);
      if (!res.ok) {
        const err = new Error(extractApiErrorMessage(json, "Update failed")) as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        err.fieldErrors = json.fieldErrors;
        throw err;
      }
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entity", id] });
      toast.success("Changes saved");
    },
    onError: (e: Error & { fieldErrors?: Record<string, string[]> }) => {
      toast.error("Save failed", { description: e.message });
    },
  });
}

export function useDeleteWikiEntity() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      id,
      redirectOnSuccess = true,
    }: {
      id: WikiEntityId;
      redirectOnSuccess?: boolean;
    }) => {
      const res = await fetch(`/api/admin/wiki-entities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await parseJsonResponse<{ error?: unknown }>(res);
        throw new Error(extractApiErrorMessage(json, "Delete failed"));
      }
      return { redirectOnSuccess };
    },
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      toast.success("Entity deleted");
      if (result.redirectOnSuccess) {
        router.push(adminRoutes.wikiEntities);
      }
    },
    onError: (e: Error) => {
      toast.error("Delete failed", { description: e.message });
    },
  });
}

export type BulkDeleteDirectoryPayload =
  | {
      mode: "selection";
      wikiEntityIds: string[];
      tournamentIds: string[];
    }
  | {
      mode: "filter";
      filter: WikiEntitiesListQuery;
    };

export function useBulkDeleteWikiDirectory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkDeleteDirectoryPayload) => {
      const res = await fetch("/api/admin/wiki-entities/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          deletedWikiCount: number;
          deletedTournamentCount: number;
          skipped: { displayName: string; reason: string }[];
          failed: { displayName: string; error: string }[];
          matched?: number;
        };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Bulk delete failed"));
      }
      return json.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      void qc.invalidateQueries({ queryKey: ["admin", "tournaments"] });
      const total = data.deletedWikiCount + data.deletedTournamentCount;
      if (total === 0) {
        toast.error("No items were deleted", {
          description: data.skipped[0]?.reason ?? data.failed[0]?.error,
        });
        return;
      }
      const parts = [
        total > 0 ? `${total} deleted` : null,
        data.skipped.length > 0 ? `${data.skipped.length} skipped` : null,
        data.failed.length > 0 ? `${data.failed.length} failed` : null,
      ].filter(Boolean);
      toast.success("Bulk delete complete", { description: parts.join(" · ") });
    },
    onError: (e: Error) => {
      toast.error("Bulk delete failed", { description: e.message });
    },
  });
}

export type BulkPublishDirectoryPayload =
  | {
      mode: "selection";
      wikiEntityIds: string[];
    }
  | {
      mode: "filter";
      filter: WikiEntitiesListQuery;
    };

export function useBulkPublishWikiDirectory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkPublishDirectoryPayload) => {
      const res = await fetch("/api/admin/wiki-entities/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          publishedCount: number;
          skipped: { displayName: string; reason: string }[];
          failed: { displayName: string; error: string }[];
          matched?: number;
        };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Bulk publish failed"));
      }
      return json.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      if (data.publishedCount === 0) {
        toast.error("No items were published", {
          description: data.skipped[0]?.reason ?? data.failed[0]?.error,
        });
        return;
      }
      const parts = [
        `${data.publishedCount} published`,
        data.skipped.length > 0 ? `${data.skipped.length} skipped` : null,
        data.failed.length > 0 ? `${data.failed.length} failed` : null,
      ].filter(Boolean);
      toast.success("Bulk publish complete", { description: parts.join(" · ") });
    },
    onError: (e: Error) => {
      toast.error("Bulk publish failed", { description: e.message });
    },
  });
}
