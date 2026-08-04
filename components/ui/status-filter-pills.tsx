"use client";

import { cn } from "@/lib/utils";

export type StatusFilterPillOption = {
  value: string;
  label: string;
};

type StatusFilterPillsProps = {
  value: string;
  options: StatusFilterPillOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

export function StatusFilterPills({
  value,
  options,
  onChange,
  ariaLabel = "Filter by status",
  className,
}: StatusFilterPillsProps) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors sm:text-sm",
              active
                ? "bg-cp-primary text-white shadow-sm"
                : "bg-cp-elevated/80 text-foreground hover:bg-cp-elevated",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
