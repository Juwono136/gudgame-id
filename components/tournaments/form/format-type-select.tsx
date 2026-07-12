"use client";

import { Check, GitBranch, LayoutGrid, Shuffle } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  FORMAT_OPTIONS,
  getAllowedFormatsForSport,
} from "@/lib/tournaments/form/format-options";
import type { TournamentFormat } from "@/lib/domain/tournaments";
import { cn } from "@/lib/utils";

const FORMAT_ICONS = {
  americano: Shuffle,
  single_elimination: GitBranch,
  double_stage: LayoutGrid,
} as const;

type FormatTypeSelectProps = {
  value: TournamentFormat;
  onChange: (value: TournamentFormat) => void;
  sportSlug?: string;
  disabled?: boolean;
  className?: string;
  officialOnly?: boolean;
};

export function FormatTypeSelect({
  value,
  onChange,
  sportSlug = "padel",
  disabled,
  className,
  officialOnly,
}: FormatTypeSelectProps) {
  const allowed = getAllowedFormatsForSport(sportSlug, { officialOnly });

  const gridClass =
    allowed.length <= 1
      ? "mx-auto grid w-full max-w-xl grid-cols-1 gap-3"
      : allowed.length === 2
        ? "mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2"
        : "grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={cn("space-y-3", className)}>
      <Label>Match format</Label>
      <p className="text-xs leading-relaxed text-cp-muted">
        Choose how players compete. Options depend on the sport — some sports favor rotation
        formats, others use knockout brackets.
      </p>
      <div className={gridClass}>
        {allowed.map((formatKey) => {
          const option = FORMAT_OPTIONS[formatKey];
          if (!option) return null;
          const Icon =
            FORMAT_ICONS[formatKey as keyof typeof FORMAT_ICONS] ?? GitBranch;
          const selected = value === formatKey;

          return (
            <button
              key={formatKey}
              type="button"
              disabled={disabled}
              onClick={() => onChange(formatKey)}
              className={cn(
                "relative flex h-full min-h-[11rem] flex-col rounded-2xl border p-4 text-left transition-all sm:min-h-[12rem] sm:p-5",
                allowed.length === 2 && "w-full",
                selected
                  ? "border-cp-primary bg-cp-primary/10 ring-1 ring-cp-primary/40"
                  : "border-cp-border bg-cp-elevated/40 hover:border-cp-primary/30 hover:bg-cp-elevated/70",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {selected ? (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-cp-primary text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <div className="flex flex-1 items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    selected
                      ? "border-cp-primary/40 bg-cp-primary/15 text-cp-primary"
                      : "border-cp-border bg-cp-card text-cp-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="font-semibold text-foreground">{option.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-cp-muted">{option.description}</p>
                  <ul className="mt-2.5 space-y-1">
                    {option.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-[11px] leading-snug text-cp-text-dim">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cp-primary/70" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
