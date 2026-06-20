"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceTabItem = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

type WorkspaceTabsProps = {
  tabs: WorkspaceTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
};

export function WorkspaceTabs({
  tabs,
  activeId,
  onChange,
  children,
  className,
}: WorkspaceTabsProps) {
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div className={cn("min-w-0 space-y-5 sm:space-y-6", className)}>
      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card/60 cp-shadow-card">
        <div
          role="tablist"
          aria-label="Section navigation"
          className="flex gap-1 overflow-x-auto border-b border-cp-border px-2 py-2 sm:px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`workspace-tab-panel-${tab.id}`}
                id={`workspace-tab-${tab.id}`}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cp-primary/15 text-cp-primary shadow-sm ring-1 ring-cp-primary/25"
                    : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
                )}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab?.description ? (
          <p className="border-b border-cp-border/60 px-4 py-3 text-xs leading-relaxed text-cp-muted sm:px-5 sm:text-sm">
            {activeTab.description}
          </p>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id={`workspace-tab-panel-${activeId}`}
        aria-labelledby={`workspace-tab-${activeId}`}
        className="min-w-0"
      >
        {children}
      </div>
    </div>
  );
}
