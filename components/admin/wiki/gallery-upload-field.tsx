"use client";

import Image from "next/image";
import { X, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MAX_GALLERY_IMAGES = 5;

export type GallerySlot = {
  id: string;
  preview: string;
  file?: File;
  existingUrl?: string;
};

type GalleryUploadFieldProps = {
  slots: GallerySlot[];
  onChange: (slots: GallerySlot[]) => void;
  label?: string;
  hint?: string;
  maxImages?: number;
};

export function GalleryUploadField({
  slots,
  onChange,
  label = "Photo gallery",
  hint = "Up to 5 images shown on the public profile page.",
  maxImages = MAX_GALLERY_IMAGES,
}: GalleryUploadFieldProps) {
  const canAdd = slots.length < maxImages;

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...slots];
    for (const file of Array.from(files)) {
      if (next.length >= maxImages) break;
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) continue;
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        preview: URL.createObjectURL(file),
        file,
      });
    }
    onChange(next);
  };

  const remove = (id: string) => {
    onChange(slots.filter((s) => s.id !== id));
  };

  return (
    <div className="rounded-xl border border-cp-border bg-cp-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-cp-muted">{hint}</p>
        </div>
        <span className="text-xs font-medium text-cp-muted">
          {slots.length}/{maxImages}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-cp-border bg-cp-elevated"
          >
            <Image src={slot.preview} alt="" fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => remove(slot.id)}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {canAdd ? (
          <label
            className={cn(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg",
              "border border-dashed border-cp-border bg-cp-elevated/50 text-cp-muted",
              "transition-colors hover:border-cp-primary/50 hover:text-cp-logo-accent",
            )}
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Add</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>

      {slots.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-cp-muted">
          <ImageIcon className="h-4 w-4" />
          JPEG, PNG, WebP or GIF · max 10 MB each
        </div>
      ) : null}
    </div>
  );
}
