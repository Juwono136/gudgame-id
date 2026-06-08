"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

import type { WikiWizardStep } from "@/lib/wiki/entity-config";

export type { WikiWizardStep };

type WikiStepperProps = {
  steps: WikiWizardStep[];
  currentIndex: number;
};

export function WikiStepper({ steps, currentIndex }: WikiStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 sm:gap-4">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                    done && "border-cp-primary bg-cp-primary text-white",
                    active && "border-cp-primary bg-cp-primary/20 text-cp-logo-accent",
                    !done && !active && "border-cp-border bg-cp-elevated text-cp-muted",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:inline",
                    active ? "text-foreground" : "text-cp-muted",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={cn(
                    "h-px w-6 sm:w-12",
                    i < currentIndex ? "bg-cp-primary" : "bg-cp-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
