"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { formatIdrInput, parseIdrInput } from "@/lib/format/currency";
import {
  GEAR_BRAND_MAX,
  GEAR_CATEGORIES,
  GEAR_CATEGORY_LABELS,
  GEAR_MODEL_MAX,
  GEAR_NAME_MAX,
  GEAR_SLUG_MAX,
  GEAR_SUMMARY_MAX,
  type GearCategory,
} from "@/lib/wiki/gear/constants";
import type { GearProductValues } from "@/lib/wiki/gear-form";

export type { GearProductValues };

type GearProductStepProps = {
  values: GearProductValues;
  onChange: (patch: Partial<GearProductValues>) => void;
  scraped?: boolean;
  errors?: Partial<Record<keyof GearProductValues, string>>;
};

export function GearProductStep({ values, onChange, scraped, errors }: GearProductStepProps) {
  const handlePriceChange = (raw: string) => {
    const parsed = parseIdrInput(raw);
    onChange({
      priceIdr: parsed != null ? formatIdrInput(parsed) : raw.replace(/[^\d]/g, ""),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <p className="text-sm text-cp-muted">
        Product identity and commerce — optional technical details on the next step.
        {scraped ? (
          <span className="ml-1 text-cp-logo-accent">Imported from external catalog.</span>
        ) : null}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Product name *</Label>
            <FieldCharCounter current={values.displayName.length} max={GEAR_NAME_MAX} />
          </div>
          <Input
            value={values.displayName}
            maxLength={GEAR_NAME_MAX}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="e.g. Adidas Metalbone 3.5"
            className="mt-1.5 border-cp-border bg-cp-elevated"
            aria-invalid={Boolean(errors?.displayName)}
          />
          {errors?.displayName ? (
            <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>
          ) : null}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>Brand *</Label>
            <FieldCharCounter current={values.brand.length} max={GEAR_BRAND_MAX} />
          </div>
          <Input
            value={values.brand}
            maxLength={GEAR_BRAND_MAX}
            onChange={(e) => onChange({ brand: e.target.value })}
            placeholder="e.g. Adidas"
            className="mt-1.5 border-cp-border bg-cp-elevated"
            aria-invalid={Boolean(errors?.brand)}
          />
          {errors?.brand ? <p className="mt-1 text-xs text-red-400">{errors.brand}</p> : null}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>Model / variant</Label>
            <FieldCharCounter current={values.model.length} max={GEAR_MODEL_MAX} />
          </div>
          <Input
            value={values.model}
            maxLength={GEAR_MODEL_MAX}
            onChange={(e) => onChange({ model: e.target.value })}
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>Category *</Label>
          <Select
            value={values.gearCategory || "racket"}
            onValueChange={(v) => onChange({ gearCategory: v })}
          >
            <SelectTrigger className="mt-1.5 border-cp-border bg-cp-elevated">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {GEAR_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {GEAR_CATEGORY_LABELS[c as GearCategory]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Price (IDR)</Label>
          <Input
            value={values.priceIdr}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="e.g. 4.899.000"
            inputMode="numeric"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
          <p className="mt-1 text-xs text-cp-muted">Optional. Shown on public gear pages.</p>
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label>URL slug</Label>
            <FieldCharCounter current={values.slug.length} max={GEAR_SLUG_MAX} />
          </div>
          <Input
            value={values.slug}
            maxLength={GEAR_SLUG_MAX}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder={slugifyWikiName(values.displayName) || "auto-generated"}
            className="mt-1.5 border-cp-border bg-cp-elevated font-mono text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Product description</Label>
            <FieldCharCounter current={values.summary.length} max={GEAR_SUMMARY_MAX} />
          </div>
          <RichTextEditor
            value={values.summary}
            onChange={(html) => onChange({ summary: html })}
            placeholder="Marketing copy, feel, target player level…"
            minHeight={140}
            maxLength={GEAR_SUMMARY_MAX}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
