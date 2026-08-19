"use client";

import { cn } from "@/lib/utils";

export type PublicSectionTab<T extends string = string> = {
  id: T;
  label: string;
};

type PublicSectionTabsProps<T extends string> = {
  tabs: PublicSectionTab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
};

/** Compact in-tab navigation so dense public tournament views stay above the fold. */
export function PublicSectionTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
  className,
}: PublicSectionTabsProps<T>) {
  if (tabs.length < 2) return null;

  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-cp-border bg-cp-elevated/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label={label}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-cp-card text-foreground shadow-sm"
                : "text-cp-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
