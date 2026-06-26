"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";

export type TeamProfileValues = {
  displayName: string;
  nickname: string;
  slug: string;
  summary: string;
  biography: string;
  teamFormat: string;
};

type TeamProfileStepProps = {
  values: TeamProfileValues;
  onChange: (patch: Partial<TeamProfileValues>) => void;
  errors?: Partial<Record<keyof TeamProfileValues, string>>;
};

export function TeamProfileStep({ values, onChange, errors }: TeamProfileStepProps) {
  return (
    <div className="space-y-5 rounded-xl border border-cp-border bg-cp-card p-5 sm:p-6">
      <p className="text-sm text-cp-muted">
        Team or duo entry — shown as the pairing on the public wiki (e.g. Coello / Tapia).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Team / pairing name *</Label>
          <Input
            value={values.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="e.g. Coello / Tapia"
            className="mt-1.5 border-cp-border bg-cp-elevated"
            aria-invalid={Boolean(errors?.displayName)}
          />
          {errors?.displayName ? (
            <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>
          ) : null}
        </div>
        <div>
          <Label>Format</Label>
          <Input
            value={values.teamFormat}
            onChange={(e) => onChange({ teamFormat: e.target.value })}
            placeholder="e.g. Pro Tour Duo"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>Tagline</Label>
          <Input
            value={values.nickname}
            onChange={(e) => onChange({ nickname: e.target.value })}
            placeholder="e.g. Current #1 · Spain"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>URL slug</Label>
          <Input
            value={values.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder={slugifyWikiName(values.displayName) || "auto-generated"}
            className="mt-1.5 border-cp-border bg-cp-elevated font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <Label>Overview</Label>
        <RichTextEditor
          value={values.summary}
          onChange={(html) => onChange({ summary: html })}
          placeholder="How the team plays together…"
          minHeight={80}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>Team story</Label>
        <RichTextEditor
          value={values.biography}
          onChange={(html) => onChange({ biography: html })}
          placeholder="Partnership history, notable wins…"
          minHeight={180}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
