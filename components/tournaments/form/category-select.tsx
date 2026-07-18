"use client";

import { Users, UserRound, UserRoundCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import { cn } from "@/lib/utils";

export const TOURNAMENT_CATEGORY_OPTIONS = ["Male", "Female", "Mix"] as const;
export type TournamentCategoryOption = (typeof TOURNAMENT_CATEGORY_OPTIONS)[number];

const CATEGORY_META: Record<
  TournamentCategoryOption,
  { description: string; icon: typeof UserRound }
> = {
  Male: {
    description: "Open to male players",
    icon: UserRound,
  },
  Female: {
    description: "Open to female players",
    icon: UserRoundCheck,
  },
  Mix: {
    description: "Mixed teams or open category",
    icon: Users,
  },
};

type CategorySelectProps = {
  value: TournamentCategoryOption | "";
  onChange: (value: TournamentCategoryOption) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  error?: string | null;
};

export function CategorySelect({
  value,
  onChange,
  disabled,
  className,
  required = false,
  error,
}: CategorySelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        Category
        {required ? <RequiredMark /> : null}
      </Label>
      <p className="text-xs text-cp-muted">
        Required for official tournaments (paid and free). Choose who may enter.
      </p>
      <div
        className={cn(
          "grid grid-cols-1 gap-2 sm:grid-cols-3",
          error && "rounded-xl ring-1 ring-red-500/50",
        )}
        role="group"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "category-select-error" : undefined}
      >
        {TOURNAMENT_CATEGORY_OPTIONS.map((category) => {
          const meta = CATEGORY_META[category];
          const Icon = meta.icon;
          const selected = value === category;

          return (
            <button
              key={category}
              type="button"
              disabled={disabled}
              onClick={() => onChange(category)}
              aria-pressed={selected}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-cp-primary bg-cp-primary/10 ring-1 ring-cp-primary/30"
                  : "border-cp-border bg-cp-elevated hover:border-cp-primary/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    selected
                      ? "bg-cp-primary/20 text-cp-primary"
                      : "bg-cp-elevated text-cp-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{category}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-cp-muted">
                    {meta.description}
                  </p>
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <FieldError id="category-select-error" message={error} />
    </div>
  );
}
