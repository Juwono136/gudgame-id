"use client";

import Link from "next/link";
import {
  Gamepad2,
  Plus,
  Settings,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardQuickLinkIcon =
  | "gamepad2"
  | "users"
  | "swords"
  | "settings"
  | "trophy"
  | "plus";

const ICONS: Record<DashboardQuickLinkIcon, LucideIcon> = {
  gamepad2: Gamepad2,
  users: Users,
  swords: Swords,
  settings: Settings,
  trophy: Trophy,
  plus: Plus,
};

export type DashboardQuickLink = {
  href: string;
  label: string;
  description: string;
  icon: DashboardQuickLinkIcon;
  accent?: "primary" | "emerald" | "default";
};

type DashboardQuickLinksProps = {
  items: DashboardQuickLink[];
  className?: string;
};

const ACCENT = {
  primary: "border-cp-primary/30 bg-cp-primary/5 hover:border-cp-primary/50",
  emerald: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50",
  default: "border-cp-border bg-cp-card/60 hover:border-cp-border/80 hover:bg-cp-elevated/40",
};

export function DashboardQuickLinks({ items, className }: DashboardQuickLinksProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const accent = item.accent ?? "default";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex min-h-[5.5rem] min-w-0 flex-col rounded-xl border p-3 transition-colors sm:min-h-[6.25rem] sm:p-4",
              ACCENT[accent],
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                accent === "emerald"
                  ? "text-emerald-400"
                  : accent === "primary"
                    ? "text-cp-primary"
                    : "text-cp-muted group-hover:text-foreground",
              )}
            />
            <span className="mt-2 text-sm font-semibold text-foreground sm:mt-3">{item.label}</span>
            <span className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-cp-muted sm:text-xs">
              {item.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
