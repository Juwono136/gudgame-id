"use client";

import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PartnerLeagueBrandUploadProps = {
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  disabled?: boolean;
  uploading?: boolean;
  className?: string;
};

/** Local preview / upload control for league brand photo (SeaweedFS upload happens in parent). */
export function PartnerLeagueBrandUpload({
  previewUrl,
  onFileSelect,
  onRemove,
  disabled = false,
  uploading = false,
  className,
}: PartnerLeagueBrandUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("space-y-2", className)}>
      <Label>League logo</Label>
      <div className="flex flex-wrap items-center gap-4">
        <span className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-elevated sm:h-24 sm:w-24">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-cp-muted">
              <ImagePlus className="h-6 w-6" aria-hidden />
            </span>
          )}
        </span>
        <div className="min-w-0 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-cp-border"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 h-3.5 w-3.5" />
              )}
              {previewUrl ? "Replace logo" : "Upload logo"}
            </Button>
            {previewUrl && onRemove ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={disabled || uploading}
                onClick={onRemove}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] leading-relaxed text-cp-muted">
            PNG, JPG, WebP or GIF · max 5MB. Stored once in SeaweedFS (replacing overwrites the
            previous file).
          </p>
        </div>
      </div>
    </div>
  );
}
