"use client";

import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  onHeroFile: (f: File) => void;
  onHeroUrl: (url: string) => void;
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
  onHeroFile,
  onHeroUrl,
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
      />
      {showHero ? (
        <ImageUploadBox
          label={heroLabel}
          preview={heroPreview}
          onFile={onHeroFile}
          onUrl={onHeroUrl}
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
          Drafts stay in the admin console until you publish.
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
}: {
  label: string;
  preview: string;
  onFile: (f: File) => void;
  onUrl: (url: string) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-cp-border bg-cp-card p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {preview ? (
        <div className="relative mt-3 aspect-square overflow-hidden rounded-lg bg-cp-elevated">
          <Image src={preview} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="mt-3 flex aspect-square items-center justify-center rounded-lg bg-cp-elevated text-xs text-cp-muted">
          PNG/JPG up to 10MB
        </div>
      )}
      <Input
        type="file"
        accept="image/*"
        className="mt-3 text-xs"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
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
