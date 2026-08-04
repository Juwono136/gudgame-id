"use client";

import { useId } from "react";
import { Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#0d9488",
  "#00bf8b",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
] as const;

type BrandColorFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  description?: string;
  className?: string;
};

function normalizeHex(raw: string): string {
  const trimmed = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return trimmed;
}

/**
 * Professional brand color control: large swatch, hex field, and preset chips.
 */
export function BrandColorField({
  id: idProp,
  label,
  value,
  onChange,
  description,
  className,
}: BrandColorFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const pickerId = `${id}-picker`;
  const hex = normalizeHex(value);
  const swatch = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#0d9488";

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {description ? <span className="text-[11px] text-cp-muted">{description}</span> : null}
      </div>

      <div className="flex items-stretch gap-3">
        <label
          htmlFor={pickerId}
          className={cn(
            "group relative flex h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-cp-border shadow-sm",
            "ring-offset-background transition hover:ring-2 hover:ring-cp-primary/35 focus-within:ring-2 focus-within:ring-cp-primary/50",
          )}
          title="Pick a color"
        >
          <span className="absolute inset-0" style={{ backgroundColor: swatch }} aria-hidden />
          <span className="absolute inset-0 flex items-end justify-end p-1 opacity-0 transition group-hover:opacity-100">
            <span className="rounded-md bg-black/45 p-1 text-white">
              <Pipette className="h-3 w-3" aria-hidden />
            </span>
          </span>
          <input
            id={pickerId}
            type="color"
            value={swatch}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </label>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
              const next = normalizeHex(value);
              if (next !== value) onChange(next);
            }}
            placeholder="#0d9488"
            spellCheck={false}
            autoComplete="off"
            className="border-cp-border bg-cp-elevated/40 font-mono text-sm uppercase tracking-wide"
            aria-describedby={`${id}-presets`}
          />
          <div
            id={`${id}-presets`}
            className="flex flex-wrap gap-1.5"
            role="list"
            aria-label={`${label} presets`}
          >
            {PRESETS.map((preset) => {
              const selected = swatch.toLowerCase() === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  role="listitem"
                  title={preset}
                  aria-label={`Use ${preset}`}
                  aria-pressed={selected}
                  onClick={() => onChange(preset)}
                  className={cn(
                    "h-6 w-6 rounded-md border border-black/10 shadow-sm transition dark:border-white/15",
                    selected
                      ? "ring-2 ring-cp-primary ring-offset-2 ring-offset-background"
                      : "hover:scale-105",
                  )}
                  style={{ backgroundColor: preset }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
