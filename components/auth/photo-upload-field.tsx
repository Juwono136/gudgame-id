"use client";

import Image from "next/image";
import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/validations/auth";

type PhotoUploadFieldProps = {
  error?: string;
  onChange: (file: File | null) => void;
};

export function PhotoUploadField({ error, onChange }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setPreview(null);
      setFileName(null);
      onChange(null);
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setLocalError("Photo must be 2 MB or smaller");
      onChange(null);
      return;
    }
    setLocalError(null);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    onChange(file);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed p-5 transition-colors sm:flex-row sm:gap-5 sm:p-6",
          error
            ? "border-[#ff6b6b]/60 bg-[#ff6b6b]/5"
            : "border-cp-border bg-cp-elevated/60 hover:border-cp-primary/40",
        )}
      >
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cp-border bg-cp-elevated">
          {preview ? (
            <Image src={preview} alt="Profile preview" fill className="object-cover" unoptimized />
          ) : (
            <Camera className="h-8 w-8 text-cp-muted" />
          )}
        </div>

        <div className="mt-4 flex flex-col items-center text-center sm:mt-0 sm:items-start sm:text-left">
          <p className="text-sm font-medium text-foreground">Upload profile photo</p>
          <p className="mt-1 text-xs text-cp-muted">
            JPEG, PNG, WebP or GIF · max 2 MB · required
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-cp-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#0033C0]"
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </button>
            {preview ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-cp-border px-3 py-2 text-xs text-cp-muted hover:text-foreground"
                onClick={() => {
                  handleFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            ) : null}
          </div>
          {fileName ? (
            <p className="mt-2 max-w-[220px] truncate text-xs text-slate-400">{fileName}</p>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          handleFile(file);
        }}
      />

      {error || localError ? (
        <p className="text-xs text-[#ff6b6b]" role="alert">
          {error ?? localError}
        </p>
      ) : null}
    </div>
  );
}
