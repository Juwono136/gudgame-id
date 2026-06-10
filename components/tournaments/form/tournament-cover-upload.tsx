"use client";

import { useRef } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { TournamentCoverPreview } from "@/components/tournaments/form/tournament-cover-preview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { revokeLocalPreviewUrl } from "@/lib/tournaments/cover-preview-url";
import { cn } from "@/lib/utils";

export type TournamentCoverValue = {
  /** Remote URL (edit mode) or blob preview URL */
  previewUrl: string | null;
  /** Already saved storage key (edit mode) */
  storageKey: string | null;
  /** New file selected but not uploaded until form save */
  pendingFile: File | null;
  /** User removed cover; clear on save */
  removed: boolean;
};

type TournamentCoverUploadProps = {
  value: TournamentCoverValue;
  onChange: (next: TournamentCoverValue) => void;
  className?: string;
};

export function TournamentCoverUpload({
  value,
  onChange,
  className,
}: TournamentCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;

    revokeLocalPreviewUrl(value.previewUrl);

    const preview = URL.createObjectURL(file);

    onChange({
      previewUrl: preview,
      storageKey: value.storageKey,
      pendingFile: file,
      removed: false,
    });

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = () => {
    revokeLocalPreviewUrl(value.previewUrl);

    onChange({
      previewUrl: null,
      storageKey: null,
      pendingFile: null,
      removed: true,
    });
  };

  const hasPreview = Boolean(value.previewUrl) && !value.removed;

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Tournament banner</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative h-36 w-full overflow-hidden rounded-xl border border-cp-border bg-cp-elevated/30 sm:h-32 sm:w-56">
          {hasPreview ? (
            <TournamentCoverPreview src={value.previewUrl!} fill />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-cp-muted">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">No banner yet</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            className="border-cp-border"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {hasPreview ? "Replace" : "Choose image"}
          </Button>
          {hasPreview ? (
            <Button
              type="button"
              variant="outline"
              className="border-red-500/40 text-red-400"
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-cp-muted">
        JPEG, PNG, WebP, or GIF — max 10 MB. Uploaded when you save the tournament.
      </p>
    </div>
  );
}
