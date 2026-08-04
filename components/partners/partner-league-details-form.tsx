"use client";

import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { PartnerLeagueBrandUpload } from "@/components/partners/partner-league-brand-upload";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTNER_LEAGUE_FIELD_LIMITS } from "@/lib/partners/league-field-limits";
import type { PartnerLeagueStatus } from "@/lib/partners/league-types";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { htmlCharCount } from "@/lib/tournaments/form/field-limits";

const STATUS_OPTIONS: { value: PartnerLeagueStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export type PartnerLeagueDetailsFormValues = {
  name: string;
  summary: string;
  description: string;
  status: PartnerLeagueStatus;
  brandPreviewUrl: string | null;
};

type PartnerLeagueDetailsFormProps = {
  values: PartnerLeagueDetailsFormValues;
  onChange: (patch: Partial<PartnerLeagueDetailsFormValues>) => void;
  onBrandFile: (file: File) => void;
  onBrandRemove?: () => void;
  nameError?: string | null;
  summaryError?: string | null;
  descriptionError?: string | null;
  disabled?: boolean;
  uploadingBrand?: boolean;
  showStatus?: boolean;
  autoFocusName?: boolean;
};

export function PartnerLeagueDetailsForm({
  values,
  onChange,
  onBrandFile,
  onBrandRemove,
  nameError,
  summaryError,
  descriptionError,
  disabled = false,
  uploadingBrand = false,
  showStatus = false,
  autoFocusName = false,
}: PartnerLeagueDetailsFormProps) {
  return (
    <div className="space-y-6">
      <PartnerLeagueBrandUpload
        previewUrl={values.brandPreviewUrl}
        onFileSelect={onBrandFile}
        onRemove={onBrandRemove}
        disabled={disabled}
        uploading={uploadingBrand}
      />

      <div className="space-y-2">
        <Label htmlFor="league-name">League name</Label>
        <Input
          id="league-name"
          value={values.name}
          onChange={(e) =>
            onChange({ name: e.target.value.slice(0, PARTNER_LEAGUE_FIELD_LIMITS.name) })
          }
          placeholder="e.g. Tolak Angin Cup"
          className="border-cp-border bg-cp-elevated/40"
          maxLength={PARTNER_LEAGUE_FIELD_LIMITS.name}
          disabled={disabled}
          autoFocus={autoFocusName}
          aria-invalid={nameError ? true : undefined}
        />
        {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
      </div>

      {showStatus ? (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={values.status}
            disabled={disabled}
            onValueChange={(v) => onChange({ status: v as PartnerLeagueStatus })}
          >
            <SelectTrigger className={cpSelectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={cpSelectContentClass}>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={cpSelectItemClass}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <Label>Short summary</Label>
          <FieldCharCounter
            current={htmlCharCount(values.summary)}
            max={PARTNER_LEAGUE_FIELD_LIMITS.summary}
          />
        </div>
        <p className="text-xs text-cp-muted">
          Teaser on league cards and public listings. Keep it short.
        </p>
        <RichTextEditor
          value={values.summary}
          onChange={(html) =>
            onChange({ summary: html.slice(0, PARTNER_LEAGUE_FIELD_LIMITS.summary) })
          }
          placeholder="One or two lines about this league brand…"
          minHeight={100}
          maxLength={PARTNER_LEAGUE_FIELD_LIMITS.summary}
        />
        {summaryError ? <p className="text-xs text-destructive">{summaryError}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <Label>Description</Label>
          <FieldCharCounter
            current={htmlCharCount(values.description)}
            max={PARTNER_LEAGUE_FIELD_LIMITS.description}
          />
        </div>
        <p className="text-xs text-cp-muted">
          Full story for the league page — sponsors, format notes, season context.
        </p>
        <RichTextEditor
          value={values.description}
          onChange={(html) =>
            onChange({ description: html.slice(0, PARTNER_LEAGUE_FIELD_LIMITS.description) })
          }
          placeholder="Overview, sponsors, house rules…"
          minHeight={180}
          maxLength={PARTNER_LEAGUE_FIELD_LIMITS.description}
        />
        {descriptionError ? (
          <p className="text-xs text-destructive">{descriptionError}</p>
        ) : null}
      </div>
    </div>
  );
}
