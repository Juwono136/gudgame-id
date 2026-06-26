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
import type { WikiFieldDefinition } from "@/lib/wiki/field-definitions";
import { cn } from "@/lib/utils";

type DynamicFieldGridProps = {
  fields: WikiFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
};

export function DynamicFieldGrid({ fields, values, onChange }: DynamicFieldGridProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-cp-muted">
        No extra fields for this sport yet. Use biography and performance JSON in
        advanced mode, or extend field definitions in code.
      </p>
    );
  }

  const groups = [...new Set(fields.map((f) => f.group))];

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupFields = fields.filter((f) => f.group === group);
        return (
          <div key={group}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cp-muted">
              {group.replace(/_/g, " ")}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {groupFields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(v) => onChange(field.key, v)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: WikiFieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `wiki-field-${field.key}`;
  const strVal = value === undefined || value === null ? "" : String(value);

  if (field.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        <Label htmlFor={id}>{field.label}</Label>
        <textarea
          id={id}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={cn(
            "mt-1.5 w-full min-h-[80px] rounded-lg border border-cp-border bg-cp-elevated px-3 py-2 text-sm text-foreground",
            "placeholder:text-cp-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary",
          )}
        />
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    const selectValue = strVal || "__unset__";
    return (
      <div>
        <Label htmlFor={id}>{field.label}</Label>
        <Select
          value={selectValue}
          onValueChange={(v) => onChange(v === "__unset__" ? "" : v)}
        >
          <SelectTrigger id={id} className="mt-1.5 border-cp-border bg-cp-elevated">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__" className="text-cp-muted">
              Not set
            </SelectItem>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "rating") {
    const num = Number(strVal) || 0;
    const max = field.max ?? 100;
    return (
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id}>{field.label}</Label>
          <span className="text-sm font-semibold text-cp-logo-accent">
            {num} / {max}
          </span>
        </div>
        <input
          id={id}
          type="range"
          min={field.min ?? 0}
          max={max}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-2 w-full accent-cp-primary"
        />
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-cp-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cp-primary to-cp-logo-accent transition-all"
            style={{ width: `${(num / max) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-cp-accent-red"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
        value={strVal}
        onChange={(e) =>
          onChange(field.type === "number" ? Number(e.target.value) : e.target.value)
        }
        placeholder={field.placeholder}
        className="mt-1.5 border-cp-border bg-cp-elevated"
      />
    </div>
  );
}
