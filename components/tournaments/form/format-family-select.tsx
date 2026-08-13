"use client";

import { Check, Sparkles, Wrench } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import type { TournamentFormatFamily } from "@/lib/tournaments/match-config";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  value: TournamentFormatFamily;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    value: "original",
    label: "Original",
    description:
      "Standard Gud Game formats — including Mexicano and classic FIP-style structures.",
    icon: Sparkles,
  },
  {
    value: "custom",
    label: "Custom",
    description:
      "Same formats with configurable meetings per pair and knockout series legs.",
    icon: Wrench,
  },
];

type FormatFamilySelectProps = {
  value: TournamentFormatFamily;
  onChange: (value: TournamentFormatFamily) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  className?: string;
};

export function FormatFamilySelect({
  value,
  onChange,
  disabled,
  required,
  error,
  className,
}: FormatFamilySelectProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <Label>
        Match family
        {required ? <RequiredMark /> : null}
      </Label>
      <p className="text-xs leading-relaxed text-cp-muted">
        Original uses preset structures. Custom unlocks how many times pairs meet in groups and
        how many legs decide each knockout slot.
      </p>
      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2",
          error && "rounded-2xl p-1 ring-1 ring-red-500/50",
        )}
        role="group"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex min-h-[7.5rem] flex-col rounded-2xl border p-4 text-left transition-all",
                selected
                  ? "border-cp-primary bg-cp-primary/10 ring-1 ring-cp-primary/40"
                  : "border-cp-border bg-cp-elevated/40 hover:border-cp-primary/30",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {selected ? (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-cp-primary text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <div className="flex items-start gap-3 pr-8">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    selected
                      ? "border-cp-primary/40 bg-cp-primary/15 text-cp-primary"
                      : "border-cp-border bg-cp-card text-cp-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <p className="font-semibold text-foreground">{option.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                    {option.description}
                  </p>
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <FieldError message={error} />
    </div>
  );
}
