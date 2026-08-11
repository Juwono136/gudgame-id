"use client";

import { cn } from "@/lib/utils";

export type SettingsTabId =
  | "profile"
  | "player-profile"
  | "roles"
  | "security"
  | "appearance";

export type SettingsTab = {
  id: SettingsTabId;
  label: string;
  shortLabel?: string;
};

type SettingsTabNavProps = {
  tabs: SettingsTab[];
  active: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
  className?: string;
};

export function SettingsTabNav({ tabs, active, onChange, className }: SettingsTabNavProps) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        "sticky top-0 z-20 -mx-1 w-full max-w-full rounded-xl border border-cp-border bg-cp-card/90 p-1 backdrop-blur-md lg:w-max",
        className,
      )}
    >
      <div className="flex w-full gap-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] lg:w-max lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "min-w-[max-content] shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-cp-primary/15 text-cp-primary shadow-sm"
                  : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
              )}
            >
              <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
