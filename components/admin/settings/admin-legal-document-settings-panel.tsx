"use client";

import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { coerceRichHtmlField } from "@/lib/wiki/sanitize-rich-text";
import type { HomepageLegalDocumentSettings } from "@/lib/validations/homepage-settings";

type AdminLegalDocumentSettingsPanelProps = {
  pageLabel: string;
  pagePath: string;
  value: HomepageLegalDocumentSettings;
  disabled?: boolean;
  onChange: <K extends keyof HomepageLegalDocumentSettings>(
    key: K,
    value: HomepageLegalDocumentSettings[K],
  ) => void;
};

export function AdminLegalDocumentSettingsPanel({
  pageLabel,
  pagePath,
  value,
  disabled = false,
  onChange,
}: AdminLegalDocumentSettingsPanelProps) {
  const idPrefix = pagePath.replace(/\//g, "") || "legal";

  return (
    <section className="space-y-5 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{pageLabel}</h2>
        <p className="mt-1 text-sm text-cp-muted">
          Content shown on the public{" "}
          <span className="font-medium text-foreground">{pagePath}</span> page. Body supports
          rich text (headings, lists, links).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-badge`}>Badge text</Label>
          <Input
            id={`${idPrefix}-badge`}
            value={value.badgeText}
            maxLength={80}
            disabled={disabled}
            onChange={(e) => onChange("badgeText", e.target.value)}
          />
          <FieldCharCounter current={value.badgeText.length} max={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-updated`}>Last updated label (optional)</Label>
          <Input
            id={`${idPrefix}-updated`}
            value={value.lastUpdatedLabel}
            maxLength={80}
            disabled={disabled}
            placeholder="Last updated: August 2026"
            onChange={(e) => onChange("lastUpdatedLabel", e.target.value)}
          />
          <FieldCharCounter current={value.lastUpdatedLabel.length} max={80} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input
            id={`${idPrefix}-title`}
            value={value.title}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => onChange("title", e.target.value)}
          />
          <FieldCharCounter current={value.title.length} max={120} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-subtitle`}>Subtitle</Label>
          <Textarea
            id={`${idPrefix}-subtitle`}
            value={value.subtitle}
            maxLength={400}
            rows={2}
            disabled={disabled}
            onChange={(e) => onChange("subtitle", e.target.value)}
          />
          <FieldCharCounter current={value.subtitle.length} max={400} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Page body</Label>
        <RichTextEditor
          value={coerceRichHtmlField(value.body) ?? value.body}
          onChange={(html) => onChange("body", html)}
          maxLength={50000}
          minHeight={280}
          placeholder={`Write the ${pageLabel.toLowerCase()}…`}
        />
      </div>
    </section>
  );
}
