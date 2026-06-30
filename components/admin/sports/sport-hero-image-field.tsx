"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resolveUserImageUrl } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type SportHeroImageFieldProps = {
  existingUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
  cleared: boolean;
};

export function SportHeroImageField({
  existingUrl,
  onFileChange,
  onClear,
  cleared,
}: SportHeroImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const resolvedExisting = !cleared ? resolveUserImageUrl(existingUrl) : null;
  const displayUrl = preview ?? resolvedExisting;

  const handleFile = (file: File | null) => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    if (!file) {
      setPreview(null);
      onFileChange(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileChange(file);
  };

  return (
    <div className="space-y-2">
      <Label>Background image</Label>
      <p className="text-xs text-cp-muted">
        Shown on the homepage sport card and the public sport hub hero. JPEG, PNG, or WebP up to
        10 MB.
      </p>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-cp-border bg-cp-elevated/50",
          displayUrl ? "aspect-[21/9]" : "flex min-h-[140px] items-center justify-center",
        )}
      >
        {displayUrl ? (
          <>
            <Image
              src={displayUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
              unoptimized={displayUrl.startsWith("blob:")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute right-2 bottom-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 bg-cp-card/90 backdrop-blur-sm"
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 bg-cp-card/90 text-red-500 backdrop-blur-sm hover:text-red-600"
                onClick={() => {
                  handleFile(null);
                  onClear();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 text-cp-muted transition-colors hover:text-foreground"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Upload background</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
