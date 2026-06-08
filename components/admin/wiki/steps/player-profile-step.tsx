"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";

export type PlayerProfileValues = {
  displayName: string;
  nickname: string;
  slug: string;
  summary: string;
  biography: string;
};

type PlayerProfileStepProps = {
  values: PlayerProfileValues;
  onChange: (patch: Partial<PlayerProfileValues>) => void;
  errors?: Partial<Record<keyof PlayerProfileValues, string>>;
};

export function PlayerProfileStep({ values, onChange, errors }: PlayerProfileStepProps) {
  return (
    <div className="space-y-5 rounded-xl border border-cp-border bg-cp-card p-5 sm:p-6">
      <p className="text-sm text-cp-muted">
        Athlete profile for the public player wiki — stats and career are configured in the next step.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Full name (official) *</Label>
          <Input
            value={values.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="e.g. Alejandro Galán"
            className="mt-1.5 border-cp-border bg-cp-elevated"
            aria-invalid={Boolean(errors?.displayName)}
          />
          {errors?.displayName ? (
            <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>
          ) : null}
        </div>
        <div>
          <Label>Nickname / handle</Label>
          <Input
            value={values.nickname}
            onChange={(e) => onChange({ nickname: e.target.value })}
            placeholder="e.g. Galán"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>URL slug</Label>
          <Input
            value={values.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder={slugifyWikiName(values.displayName) || "auto-generated"}
            className="mt-1.5 border-cp-border bg-cp-elevated font-mono text-sm"
          />
          {errors?.slug ? <p className="mt-1 text-xs text-red-400">{errors.slug}</p> : null}
        </div>
      </div>

      <div>
        <Label>Tagline / short intro</Label>
        <RichTextEditor
          value={values.summary}
          onChange={(html) => onChange({ summary: html })}
          placeholder="One-line intro for the hero section"
          minHeight={80}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>Biography</Label>
        <RichTextEditor
          value={values.biography}
          onChange={(html) => onChange({ biography: html })}
          placeholder="Career history, playing style, achievements…"
          minHeight={200}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
