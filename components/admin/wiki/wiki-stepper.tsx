"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

import type { WikiWizardStep } from "@/lib/wiki/entity-config";

export type { WikiWizardStep };

type WikiStepperProps = {
  steps: WikiWizardStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
  layout?: "inline" | "segmented";
};

export function WikiStepper({
  steps,
  currentIndex,
  onStepClick,
  layout = "inline",
}: WikiStepperProps) {
  const interactive = Boolean(onStepClick);

  if (layout === "segmented") {
    const gridColsClass =
      steps.length === 2
        ? "sm:grid-cols-2"
        : steps.length === 4
          ? "sm:grid-cols-4"
          : "sm:grid-cols-3";

    const stepCircleClass = (done: boolean, active: boolean) =>
      cn(
        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-all",
        done && "border-cp-primary bg-cp-primary text-white shadow-sm shadow-cp-primary/25",
        active && "border-cp-primary bg-cp-primary/15 text-cp-primary ring-2 ring-cp-primary/25",
        !done && !active && "border-cp-border bg-cp-card text-cp-muted",
      );

    const mobileLabel = (step: WikiWizardStep) => step.shortLabel ?? step.label;

    const trackFillPercent =
      steps.length <= 1 ? 0 : (currentIndex / (steps.length - 1)) * 100;

    return (
      <nav aria-label="Progress">
        {/* Mobile: aligned grid with progress track + labels */}
        <div className="sm:hidden">
          <div className="relative px-1">
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
                  className="absolute top-[13px] h-0.5 rounded-full bg-cp-primary transition-all duration-300 ease-out"
                  style={{
                    left: `${50 / steps.length}%`,
                    width: `calc((100% - ${100 / steps.length}%) * ${trackFillPercent / 100})`,
                  }}
                  aria-hidden
                />
              </>
            ) : null}

            <ol
              className="relative grid gap-1"
              style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
            >
              {steps.map((step, i) => {
                const done = i < currentIndex;
                const active = i === currentIndex;
                const label = mobileLabel(step);

                const stepContent = (
                  <>
                    <span className={stepCircleClass(done, active)}>
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 max-w-[6.5rem] text-center text-[10px] leading-tight sm:max-w-none",
                        active && "font-semibold text-foreground",
                        done && !active && "text-cp-muted",
                        !done && !active && "text-cp-muted/80",
                      )}
                    >
                      {label}
                    </span>
                  </>
                );

                return (
                  <li key={step.id} className="flex min-w-0 justify-center">
                    {interactive ? (
                      <button
                        type="button"
                        onClick={() => onStepClick?.(i)}
                        aria-current={active ? "step" : undefined}
                        aria-label={step.label}
                        className={cn(
                          "flex min-h-[44px] min-w-0 flex-col items-center rounded-lg px-1 py-0.5 transition-colors",
                          active && "bg-cp-primary/5",
                          "active:bg-cp-elevated/80",
                        )}
                      >
                        {stepContent}
                      </button>
                    ) : (
                      <div
                        className={cn(
                          "flex min-w-0 flex-col items-center px-1 py-0.5",
                          active && "rounded-lg bg-cp-primary/5",
                        )}
                        aria-current={active ? "step" : undefined}
                      >
                        {stepContent}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* sm+: full segmented cards */}
        <ol className={cn("hidden gap-2 sm:grid", gridColsClass)}>
          {steps.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const content = (
              <>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all sm:h-9 sm:w-9",
                    done && "border-cp-primary bg-cp-primary text-white",
                    active && "border-cp-primary bg-cp-primary/15 text-cp-primary",
                    !done && !active && "border-cp-border bg-cp-card text-cp-muted",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span
                    className={cn(
                      "block text-sm font-semibold leading-snug sm:text-sm",
                      active ? "text-foreground" : "text-cp-muted",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="mt-0.5 hidden text-[11px] text-cp-muted sm:block">
                    {done ? "Completed" : active ? "In progress" : `Step ${i + 1}`}
                  </span>
                </span>
              </>
            );

            const segmentClass = cn(
              "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-all sm:gap-3 sm:px-4 sm:py-3.5",
              active && "border-cp-primary/35 bg-cp-card shadow-sm",
              done && !active && "border-cp-border/70 bg-cp-primary/[0.06]",
              !done && !active && "border-transparent bg-cp-elevated/60",
              interactive && "hover:border-cp-primary/25 hover:bg-cp-card/80",
            );

            return (
              <li key={step.id} className="min-w-0">
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(i)}
                    aria-current={active ? "step" : undefined}
                    className={cn(segmentClass, "text-left")}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={segmentClass} aria-current={active ? "step" : undefined}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Progress" className="mb-6 sm:mb-8">
      <ol className="flex items-stretch gap-1 sm:gap-2">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          const stepBody = (
            <>
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all sm:h-10 sm:w-10",
                  done && "border-cp-primary bg-cp-primary text-white shadow-sm shadow-cp-primary/30",
                  active &&
                    "border-cp-primary bg-cp-primary/15 text-cp-primary ring-2 ring-cp-primary/25",
                  !done && !active && "border-cp-border bg-cp-elevated text-cp-muted",
                  interactive &&
                    !active &&
                    "hover:border-cp-primary/50 hover:bg-cp-primary/10 hover:text-cp-primary",
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 sm:flex-none">
                <span
                  className={cn(
                    "block text-xs font-semibold sm:text-sm",
                    active ? "text-foreground" : "text-cp-muted",
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 hidden text-[10px] text-cp-muted sm:block">
                  {done ? "Completed" : active ? "In progress" : `Step ${i + 1}`}
                </span>
              </span>
            </>
          );

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(i)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full min-w-0 flex-col items-center gap-2 rounded-xl px-2 py-2 text-center transition-colors sm:flex-row sm:px-3 sm:text-left",
                      active && "bg-cp-primary/5",
                      "cursor-pointer hover:bg-cp-elevated/80",
                    )}
                  >
                    {stepBody}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex w-full flex-col items-center gap-2 px-2 py-2 text-center sm:flex-row sm:gap-3 sm:text-left",
                      active && "rounded-xl bg-cp-primary/5",
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {stepBody}
                  </div>
                )}
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 hidden h-0.5 flex-1 rounded-full sm:block",
                    i < currentIndex ? "bg-cp-primary" : "bg-cp-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
