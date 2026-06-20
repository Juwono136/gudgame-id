"use client";

import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PerformanceBars } from "@/components/wiki/performance-bars";
import {
  GEAR_SHAPE_LABELS,
  getFilledGearPerformance,
  getFilledGearSpecs,
} from "@/lib/wiki/gear/spec-display";
import {
  getGearSpecsFields,
  getGearSpecsHint,
} from "@/lib/wiki/gear/spec-fields";
import type { GearCategory } from "@/lib/wiki/gear/constants";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";
import { cn } from "@/lib/utils";

type GearSpecsStepProps = {
  sportSlug: string;
  gearCategory: string;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
};

function OptionalTag() {
  return (
    <span className="ml-1.5 rounded-full border border-cp-border bg-cp-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cp-muted">
      Optional
    </span>
  );
}

export function GearSpecsStep({
  sportSlug,
  gearCategory,
  values,
  onChange,
}: GearSpecsStepProps) {
  const category = normalizeGearCategory(gearCategory);
  const fields = getGearSpecsFields(sportSlug, category);
  const specFields = fields.filter((f) => f.group === "specs");
  const perfFields = fields.filter((f) => f.group === "performance");
  const hint = getGearSpecsHint(category);

  const filledSpecs = getFilledGearSpecs(
    Object.fromEntries(specFields.map((f) => [f.key, values[f.key]])),
  );
  const filledPerf = getFilledGearPerformance(
    Object.fromEntries(perfFields.map((f) => [f.key, values[f.key]])),
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Technical details</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cp-muted">{hint}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cp-primary/25 bg-cp-primary/5 px-3 py-2 text-xs text-cp-logo-accent">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Leave blank to hide on the public page
          </div>
        </div>
      </div>

      {specFields.length > 0 ? (
        <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Physical specs
            <OptionalTag />
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {specFields.map((field) => {
              const id = `gear-spec-${field.key}`;
              const raw = values[field.key];
              const strVal = raw == null ? "" : String(raw);

              if (field.key === "shape" && field.options) {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <Label>{field.label}</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {field.options.map((opt) => {
                        const active = strVal === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              onChange(field.key, active ? "" : opt.value)
                            }
                            className={cn(
                              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                              active
                                ? "border-cp-primary bg-cp-primary/15 text-cp-primary"
                                : "border-cp-border bg-cp-elevated text-cp-muted hover:border-cp-primary/40 hover:text-foreground",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      {strVal ? (
                        <button
                          type="button"
                          onClick={() => onChange(field.key, "")}
                          className="rounded-lg border border-dashed border-cp-border px-3 py-2 text-xs text-cp-muted hover:text-foreground"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    {strVal ? (
                      <p className="mt-2 text-xs text-cp-muted">
                        Selected: {GEAR_SHAPE_LABELS[strVal] ?? strVal}
                      </p>
                    ) : null}
                  </div>
                );
              }

              return (
                <div
                  key={field.key}
                  className={field.key === "core" ? "sm:col-span-2" : undefined}
                >
                  <Label htmlFor={id}>{field.label}</Label>
                  <Input
                    id={id}
                    value={strVal}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="mt-1.5 border-cp-border bg-cp-elevated"
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {perfFields.length > 0 ? (
        <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Performance feel
            <OptionalTag />
          </h3>
          <p className="mt-1 text-xs text-cp-muted">
            Rate how the gear feels on court. Ratings above 0 appear on the public product page.
          </p>
          <div className="mt-5 space-y-6">
            {perfFields.map((field) => {
              const id = `gear-perf-${field.key}`;
              const max = field.max ?? 100;
              const num = Number(values[field.key]) || 0;
              const presets = [0, 25, 50, 75, 100];

              return (
                <div key={field.key} className="rounded-lg border border-cp-border/70 bg-cp-elevated/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        num > 0 ? "text-cp-logo-accent" : "text-cp-muted",
                      )}
                    >
                      {num > 0 ? `${num} / ${max}` : "Not set"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {presets.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onChange(field.key, p === 0 ? "" : p)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          (p === 0 && num === 0) || num === p
                            ? "border-cp-primary bg-cp-primary/15 text-cp-primary"
                            : "border-cp-border text-cp-muted hover:text-foreground",
                        )}
                      >
                        {p === 0 ? "Skip" : p}
                      </button>
                    ))}
                  </div>
                  <input
                    id={id}
                    type="range"
                    min={0}
                    max={max}
                    value={num}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onChange(field.key, v === 0 ? "" : v);
                    }}
                    className="mt-3 w-full accent-cp-primary"
                  />
                  {num > 0 ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cp-elevated">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cp-primary to-cp-logo-accent transition-all"
                        style={{ width: `${(num / max) * 100}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {(filledSpecs.length > 0 || filledPerf.length > 0) && (
        <section className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/20 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
            Live preview — public page
          </p>
          <div className="mt-4 space-y-4">
            {filledSpecs.length > 0 ? (
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filledSpecs.map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between gap-3 rounded-lg border border-cp-border/60 bg-cp-card px-3 py-2"
                  >
                    <dt className="text-xs text-cp-muted">{item.label}</dt>
                    <dd className="text-right text-sm font-medium text-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {filledPerf.length > 0 ? (
              <PerformanceBars metrics={filledPerf} />
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
