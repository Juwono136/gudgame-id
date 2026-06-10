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
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const accent = item.accent ?? "default";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex flex-col rounded-xl border p-4 transition-colors",
              ACCENT[accent],
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                accent === "emerald"
                  ? "text-emerald-400"
                  : accent === "primary"
                    ? "text-cp-primary"
                    : "text-cp-muted group-hover:text-foreground",
              )}
            />
            <span className="mt-3 text-sm font-semibold text-foreground">{item.label}</span>
            <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-cp-muted">
              {item.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
