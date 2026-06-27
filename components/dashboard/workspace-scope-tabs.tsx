"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceScopeTab<T extends string = string> = {
  id: T;
  label: string;
  shortLabel?: string;
  hint?: string;
  icon: LucideIcon;
};

type WorkspaceScopeTabsProps<T extends string> = {
  tabs: WorkspaceScopeTab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
};

export function WorkspaceScopeTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: WorkspaceScopeTabsProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Mobile: compact segmented control */}
      <div
        className="flex rounded-xl border border-cp-border bg-cp-elevated/40 p-1 sm:hidden"
        role="tablist"
        aria-label="Section"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-cp-primary text-white shadow-sm"
                  : "text-cp-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.shortLabel ?? tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop: card tabs */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                isActive
                  ? "border-cp-primary/50 bg-cp-primary/10"
                  : "border-cp-border bg-cp-card/50 hover:border-cp-primary/30",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isActive ? "bg-cp-primary/20 text-cp-primary" : "bg-cp-elevated text-cp-muted",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{tab.label}</p>
                {tab.hint ? (
                  <p className="mt-1 text-xs leading-relaxed text-cp-muted">{tab.hint}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
