"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import type { GearProductValues } from "@/lib/wiki/gear-form";

export type { GearProductValues };

type GearProductStepProps = {
  values: GearProductValues;
  onChange: (patch: Partial<GearProductValues>) => void;
  scraped?: boolean;
};

export function GearProductStep({ values, onChange, scraped }: GearProductStepProps) {
  return (
    <div className="space-y-4 rounded-xl border border-cp-border bg-cp-card p-5">
      <p className="text-sm text-cp-muted">
        Product identity — no player biography fields. Use specs step for technical data.
        {scraped ? (
          <span className="ml-1 text-cp-logo-accent">Imported from external catalog.</span>
        ) : null}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Product name *</Label>
          <Input
            value={values.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="e.g. Adidas Metalbone 3.5"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>Brand *</Label>
          <Input
            value={values.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
            placeholder="e.g. Adidas"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>Model / variant</Label>
          <Input
            value={values.model}
            onChange={(e) => onChange({ model: e.target.value })}
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Input
            value={values.gearCategory}
            onChange={(e) => onChange({ gearCategory: e.target.value })}
            placeholder="racket, shoes, bag…"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>Price (display)</Label>
          <Input
            value={values.price}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="e.g. Rp 4.899.000"
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
        <div className="sm:col-span-2">
          <Label>Product description</Label>
          <RichTextEditor
            value={values.summary}
            onChange={(html) => onChange({ summary: html })}
            placeholder="Marketing copy, feel, target player level…"
            minHeight={140}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
