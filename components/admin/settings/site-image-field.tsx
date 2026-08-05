"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SITE_IMAGE_SPECS,
  siteImageHint,
  validateSiteImageFile,
  type SiteMediaKind,
} from "@/lib/site/image-specs";
import { resolveSiteImageUrl } from "@/lib/site/resolve-image";
import { cn } from "@/lib/utils";

export type SiteImagePendingState = {
  file: File | null;
  /** True when user reset to the built-in default (SeaweedFS object should be deleted on save). */
  cleared: boolean;
};

type SiteImageFieldProps = {
  kind: SiteMediaKind;
  label: string;
  value: string;
  fallbackUrl: string;
  pending: SiteImagePendingState;
  onPendingChange: (next: SiteImagePendingState) => void;
  aspectClassName?: string;
  disabled?: boolean;
};

export function SiteImageField({
  kind,
  label,
  value,
  fallbackUrl,
  pending,
  onPendingChange,
  aspectClassName = "aspect-[21/9]",
  disabled = false,
}: SiteImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const spec = SITE_IMAGE_SPECS[kind];
  const hint = siteImageHint(spec);

  useEffect(() => {
    if (!pending.file) {
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(pending.file);
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [pending.file]);

  const storedUrl = pending.cleared
    ? fallbackUrl
    : resolveSiteImageUrl(value || fallbackUrl, fallbackUrl);
  const displayUrl = preview ?? storedUrl;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setValidating(true);
    try {
      const result = await validateSiteImageFile(file, kind);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.warning) {
        toast.message(result.warning);
      }
      onPendingChange({ file, cleared: false });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs leading-relaxed text-cp-muted">{hint}</p>
      {pending.file ? (
        <p className="text-xs font-medium text-cp-primary">
          New image selected — will upload to SeaweedFS when you save.
        </p>
      ) : null}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-cp-border bg-cp-elevated/50",
          displayUrl ? aspectClassName : "flex min-h-[140px] items-center justify-center",
        )}
      >
        {displayUrl ? (
          <>
            <Image
              src={displayUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className={kind === "hero-banner" ? "object-cover" : "object-contain p-4"}
              unoptimized={displayUrl.startsWith("blob:")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute right-2 bottom-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || validating}
                className="h-8 bg-cp-card/90 backdrop-blur-sm"
                onClick={() => inputRef.current?.click()}
              >
                {validating ? "Checking…" : "Replace"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || validating}
                className="h-8 bg-cp-card/90 text-red-500 backdrop-blur-sm hover:text-red-600"
                onClick={() => onPendingChange({ file: null, cleared: true })}
                aria-label="Reset to default image"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || validating}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 text-cp-muted transition-colors hover:text-foreground"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">Choose image</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={spec.acceptAttr}
        className="hidden"
        disabled={disabled || validating}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void handleFile(file);
        }}
      />
    </div>
  );
}
