"use client";

import { Check, Medal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import {
  PLAYER_TIER_LABELS,
  PLAYER_TIER_LEVELS,
  type PlayerTierLevel,
} from "@/lib/player/tier";
import { cn } from "@/lib/utils";

const TIER_META: Record<
  PlayerTierLevel,
  { description: string; accent: string; selectedAccent: string }
> = {
  pemula: {
    description: "New and developing players",
    accent: "border-slate-300/80 bg-slate-100/80 text-slate-800 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200",
    selectedAccent:
      "border-slate-500/50 bg-slate-200/90 text-slate-900 ring-1 ring-slate-400/40 dark:border-slate-400/40 dark:bg-slate-500/20 dark:text-slate-100",
  },
  menengah: {
    description: "Consistent club-level players",
    accent:
      "border-sky-300/80 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
    selectedAccent:
      "border-sky-500/50 bg-sky-100 text-sky-950 ring-1 ring-sky-400/40 dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-100",
  },
  pro: {
    description: "Advanced competitive players",
    accent:
      "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    selectedAccent:
      "border-emerald-600/50 bg-emerald-100 text-emerald-950 ring-1 ring-emerald-500/40 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-100",
  },
  gold: {
    description: "Top-tier ranked players",
    accent:
      "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    selectedAccent:
      "border-amber-600/50 bg-amber-100 text-amber-950 ring-1 ring-amber-500/40 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-100",
  },
};

type AllowedTierLevelsSelectProps = {
  value: PlayerTierLevel[];
  onChange: (value: PlayerTierLevel[]) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  error?: string | null;
  description?: string;
};

export function AllowedTierLevelsSelect({
  value,
  onChange,
  disabled,
  className,
  required = false,
  error,
  description = "Only players whose current skill tier matches a selected level can join or register.",
}: AllowedTierLevelsSelectProps) {
  const toggle = (tier: PlayerTierLevel) => {
    if (disabled) return;
    if (value.includes(tier)) {
      if (value.length === 1) return;
      onChange(value.filter((item) => item !== tier));
      return;
    }
    onChange(PLAYER_TIER_LEVELS.filter((item) => value.includes(item) || item === tier));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2">
        <Medal className="h-4 w-4 text-cp-primary" aria-hidden />
        Allowed player tiers
        {required ? <RequiredMark /> : null}
      </Label>
      <p className="text-xs leading-relaxed text-cp-muted">{description}</p>
      <div
        className={cn(
          "grid grid-cols-1 gap-2 sm:grid-cols-2",
          error && "rounded-xl ring-1 ring-red-500/50",
        )}
        role="group"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "allowed-tier-levels-error" : undefined}
      >
        {PLAYER_TIER_LEVELS.map((tier) => {
          const meta = TIER_META[tier];
          const selected = value.includes(tier);
          return (
            <button
              key={tier}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tier)}
              aria-pressed={selected}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected ? meta.selectedAccent : meta.accent,
                !selected && "hover:border-cp-primary/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <p className="text-sm font-semibold">{PLAYER_TIER_LABELS[tier]}</p>
                  <p className="mt-0.5 text-xs leading-relaxed opacity-90">{meta.description}</p>
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? "border-current bg-current/10 text-current"
                      : "border-cp-border/80 text-transparent",
                  )}
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <FieldError id="allowed-tier-levels-error" message={error} />
    </div>
  );
}
