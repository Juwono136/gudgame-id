"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import {
  getTournamentDisplayConfig,
  MAX_DISPLAY_SPONSOR_BANNERS,
  type TournamentDisplayConfig,
  type TournamentDisplaySponsorBanner,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { cn } from "@/lib/utils";

type DisplaySponsorBannersPanelProps = {
  tournament: TournamentDetail;
  onSaved?: () => void | Promise<void>;
};

type DisplayConfigResponse = {
  success: boolean;
  data: { displayConfig: TournamentDisplayConfig };
  error?: unknown;
};

export function DisplaySponsorBannersPanel({
  tournament,
  onSaved,
}: DisplaySponsorBannersPanelProps) {
  const { confirm } = useConfirmDialog();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [banners, setBanners] = useState<TournamentDisplaySponsorBanner[]>(
    () => getTournamentDisplayConfig(tournament).sponsorBanners ?? [],
  );

  // Keep banners in sync when manage-detail refetch updates tournament.settings
  useEffect(() => {
    setBanners(getTournamentDisplayConfig(tournament).sponsorBanners ?? []);
  }, [tournament]);

  const invalidate = async (next?: TournamentDisplayConfig) => {
    if (next?.sponsorBanners) setBanners(next.sponsorBanners);
    else if (next && !next.sponsorBanners) setBanners([]);
    await qc.invalidateQueries({
      queryKey: ["tournaments", "manage-detail", tournament.sportSlug, tournament.slug],
    });
    void qc.invalidateQueries({
      queryKey: tournamentQueryKeys.live(tournament.sportSlug, tournament.slug),
    });
    await onSaved?.();
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/display/sponsors`,
        { method: "POST", body: form },
      );
      const json = await parseJsonResponse<DisplayConfigResponse>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not upload sponsor banner"));
      }
      return json.data.displayConfig;
    },
    onSuccess: async (cfg) => {
      toast.success("Sponsor banner added");
      await invalidate(cfg);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (bannerId: string) => {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/display/sponsors`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bannerId }),
        },
      );
      const json = await parseJsonResponse<DisplayConfigResponse>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not remove sponsor banner"));
      }
      return json.data.displayConfig;
    },
    onSuccess: async (cfg) => {
      toast.success("Sponsor banner removed");
      await invalidate(cfg);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/display/sponsors`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        },
      );
      const json = await parseJsonResponse<DisplayConfigResponse>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not reorder sponsors"));
      }
      return json.data.displayConfig;
    },
    onSuccess: async (cfg) => {
      await invalidate(cfg);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = upload.isPending || remove.isPending || reorder.isPending;
  const atMax = banners.length >= MAX_DISPLAY_SPONSOR_BANNERS;

  const move = (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= banners.length) return;
    const next = [...banners];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item!);
    setBanners(next);
    reorder.mutate(next.map((b) => b.id));
  };

  const handleRemove = async (banner: TournamentDisplaySponsorBanner) => {
    const ok = await confirm({
      title: "Remove sponsor banner?",
      description: "This image will be removed from the venue fullscreen display.",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    remove.mutate(banner.id);
  };

  return (
    <div className="relative rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <LoadingOverlay show={busy} />
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/10 text-cp-primary">
          <ImageIcon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Sponsor banners</h2>
          <p className="mt-1 text-sm text-cp-muted">
            Add up to {MAX_DISPLAY_SPONSOR_BANNERS} logos for the venue fullscreen display header.
            They appear at the top of TV monitors only — not on the public tournament page.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-8 text-center">
            <ImageIcon className="h-8 w-8 text-cp-muted" />
            <p className="text-sm text-cp-muted">No sponsor banners yet</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {banners.map((b, index) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-cp-border bg-cp-elevated/40 px-3 py-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.imageUrl}
                  alt={b.label || "Sponsor"}
                  className="h-12 w-20 rounded-md object-contain bg-cp-bg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {b.label?.trim() || `Sponsor ${index + 1}`}
                  </p>
                  <p className="text-[11px] text-cp-muted">Shown on venue display</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={busy || index === banners.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    disabled={busy}
                    onClick={() => void handleRemove(b)}
                    aria-label="Remove banner"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (inputRef.current) inputRef.current.value = "";
              if (!file) return;
              if (atMax) {
                toast.error(`Maximum ${MAX_DISPLAY_SPONSOR_BANNERS} banners`);
                return;
              }
              upload.mutate(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={busy || atMax}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload banner
          </Button>
          <Label className={cn("text-xs text-cp-muted", atMax && "text-amber-500")}>
            {banners.length}/{MAX_DISPLAY_SPONSOR_BANNERS} used
          </Label>
        </div>
      </div>
    </div>
  );
}
