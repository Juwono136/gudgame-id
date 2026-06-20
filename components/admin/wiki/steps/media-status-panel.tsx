"use client";

import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WikiEntityUpsertInput } from "@/lib/validations/wiki-entities";

type MediaStatusPanelProps = {
  status: WikiEntityUpsertInput["status"];
  onStatusChange: (s: WikiEntityUpsertInput["status"]) => void;
  primaryPreview: string;
  heroPreview: string;
  onPrimaryFile: (f: File) => void;
  onPrimaryUrl: (url: string) => void;
  onPrimaryRemove?: () => void;
  onHeroFile: (f: File) => void;
  onHeroUrl: (url: string) => void;
  onHeroRemove?: () => void;
  primaryLabel?: string;
  heroLabel?: string;
  showHero?: boolean;
};

export function MediaStatusPanel({
  status,
  onStatusChange,
  primaryPreview,
  heroPreview,
  onPrimaryFile,
  onPrimaryUrl,
  onPrimaryRemove,
  onHeroFile,
  onHeroUrl,
  onHeroRemove,
  primaryLabel = "Primary image",
  heroLabel = "Hero / banner (optional)",
  showHero = true,
}: MediaStatusPanelProps) {
  return (
    <aside className="space-y-4">
      <ImageUploadBox
        label={primaryLabel}
        preview={primaryPreview}
        onFile={onPrimaryFile}
        onUrl={onPrimaryUrl}
        onRemove={onPrimaryRemove}
      />
      {showHero ? (
        <ImageUploadBox
          label={heroLabel}
          preview={heroPreview}
          onFile={onHeroFile}
          onUrl={onHeroUrl}
          onRemove={onHeroRemove}
        />
      ) : null}
      <div className="rounded-xl border border-cp-border bg-cp-card p-4">
        <Label>Publication status</Label>
        <Select value={status} onValueChange={(v) => onStatusChange(v as typeof status)}>
          <SelectTrigger className="mt-1.5 border-cp-border bg-cp-elevated">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-cp-muted">
          Drafts stay in the admin console until you publish. Images upload only when you save.
        </p>
      </div>
    </aside>
  );
}

function ImageUploadBox({
  label,
  preview,
  onFile,
  onUrl,
  onRemove,
}: {
  label: string;
  preview: string;
  onFile: (f: File) => void;
  onUrl: (url: string) => void;
  onRemove?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-dashed border-cp-border bg-cp-card p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {preview ? (
        <div className="relative mt-3 aspect-square overflow-hidden rounded-lg bg-cp-elevated">
          <Image src={preview} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="mt-3 flex aspect-square flex-col items-center justify-center gap-2 rounded-lg bg-cp-elevated text-xs text-cp-muted">
          <ImagePlus className="h-6 w-6 opacity-50" />
          PNG/JPG up to 10MB
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-cp-border text-xs"
          onClick={() => fileRef.current?.click()}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {preview ? "Edit" : "Upload"}
        </Button>
        {preview && onRemove ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        ) : null}
      </div>
      <Input
        placeholder="Or paste image URL"
        className="mt-2 border-cp-border bg-cp-elevated text-xs"
        onBlur={(e) => {
          if (e.target.value.trim()) onUrl(e.target.value.trim());
        }}
      />
    </div>
  );
}
