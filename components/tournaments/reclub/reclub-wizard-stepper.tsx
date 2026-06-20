"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReclubWizardStep = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

type ReclubWizardStepperProps = {
  steps: ReclubWizardStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
  disabled?: boolean;
};

function stepDisplayLabel(step: ReclubWizardStep, variant: "mobile" | "compact" | "full"): string {
  if (variant === "full") return step.label;
  return step.shortLabel ?? step.label;
}

export function ReclubWizardStepper({
  steps,
  currentIndex,
  onStepClick,
  disabled = false,
}: ReclubWizardStepperProps) {
  const trackFillPercent =
    steps.length <= 1 ? 0 : (currentIndex / (steps.length - 1)) * 100;

  return (
    <nav aria-label="Reclub session progress" className="w-full">
      {/* Mobile: compact track + circles */}
      <div className="w-full sm:hidden">
        <div className="relative w-full px-1">
          {steps.length > 1 ? (
            <>
              <div
                className="absolute top-[13px] h-0.5 rounded-full bg-cp-border"
                style={{
                  left: `${50 / steps.length}%`,
                  right: `${50 / steps.length}%`,
                }}
                aria-hidden
              />
              <div
                className="absolute top-[13px] h-0.5 rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{
                  left: `${50 / steps.length}%`,
                  width: `calc((100% - ${100 / steps.length}%) * ${trackFillPercent / 100})`,
                }}
                aria-hidden
              />
            </>
          ) : null}

          <ol
            className="relative grid w-full gap-1"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          >
            {steps.map((step, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const Icon = step.icon;
              const label = stepDisplayLabel(step, "mobile");

              return (
                <li key={step.id} className="flex min-w-0">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onStepClick(i)}
                    aria-current={active ? "step" : undefined}
                    aria-label={step.label}
                    className={cn(
                      "flex min-h-[44px] w-full min-w-0 flex-col items-center rounded-lg px-1 py-0.5 transition-colors",
                      active && "bg-emerald-500/10",
                      !disabled && "hover:bg-cp-elevated/80 active:bg-cp-elevated",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-all",
                        done && "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
                        active && "border-emerald-500 bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/25",
                        !done && !active && "border-cp-border bg-cp-card text-cp-muted",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 w-full truncate px-0.5 text-center text-[10px] leading-tight",
                        active && "font-semibold text-foreground",
                        !active && "text-cp-muted",
                      )}
                      title={step.label}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* sm–lg: 2×2 grid; xl+: single row of 4 equal columns */}
      <ol
        className={cn(
          "hidden w-full gap-2 sm:grid",
          steps.length === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex min-w-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onStepClick(i)}
                aria-current={active ? "step" : undefined}
                aria-label={step.label}
                className={cn(
                  "flex h-full w-full min-h-[4.25rem] items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all sm:gap-3 sm:px-4",
                  active && "border-emerald-500/50 bg-emerald-500/10 shadow-sm",
                  done && !active && "border-cp-border/70 bg-emerald-500/[0.06] hover:border-emerald-500/30",
                  !done && !active && "border-transparent bg-cp-elevated/60 hover:border-emerald-500/20 hover:bg-cp-elevated/80",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all sm:h-9 sm:w-9",
                    done && "border-emerald-500 bg-emerald-500 text-white",
                    active && "border-emerald-500 bg-emerald-500/15 text-emerald-400",
                    !done && !active && "border-cp-border bg-cp-card text-cp-muted",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold leading-snug xl:hidden",
                      active ? "text-foreground" : "text-cp-muted",
                    )}
                    title={step.label}
                  >
                    {stepDisplayLabel(step, "compact")}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-sm font-semibold leading-snug xl:block",
                      active ? "text-foreground" : "text-cp-muted",
                    )}
                    title={step.label}
                  >
                    {stepDisplayLabel(step, "full")}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-cp-muted">
                    {done ? "Completed" : active ? "In progress" : `Step ${i + 1}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
