"use client";

import Link from "next/link";
import { LayoutGroup, motion } from "framer-motion";
import { Trophy, Users } from "lucide-react";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { canShowHostWorkspaceSwitcher } from "@/lib/roles/workspace-ui";
import { cn } from "@/lib/utils";

type WorkspaceRoleSwitcherProps = {
  roles: AppRole[];
  variant: "player" | "host";
  className?: string;
};

const SEGMENTS = [
  {
    id: "player" as const,
    href: dashboardRoutes.home,
    label: "Player",
    icon: Users,
  },
  {
    id: "host" as const,
    href: dashboardRoutes.host,
    label: "Host",
    icon: Trophy,
  },
];

export function WorkspaceRoleSwitcher({ roles, variant, className }: WorkspaceRoleSwitcherProps) {
  if (!canShowHostWorkspaceSwitcher(roles)) return null;

  return (
    <div className={cn("lg:hidden", className)}>
      <LayoutGroup id="workspace-role-switcher">
        <div
          className="relative flex rounded-xl border border-cp-primary/25 bg-cp-primary/5 p-1 dark:border-cp-primary/20 dark:bg-cp-elevated/40"
          role="group"
          aria-label="Switch workspace"
        >
        {SEGMENTS.map((segment) => {
          const isActive = variant === segment.id;
          const Icon = segment.icon;

          return (
            <Link
              key={segment.id}
              href={segment.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors",
                isActive
                  ? "text-white"
                  : "text-cp-muted hover:text-foreground dark:text-cp-muted dark:hover:text-foreground",
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="workspace-role-active-pill"
                  className="absolute inset-0 rounded-lg bg-cp-primary shadow-sm dark:bg-cp-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <Icon className="h-4 w-4 shrink-0" />
                {segment.label}
              </span>
            </Link>
          );
        })}
        </div>
      </LayoutGroup>
      <p className="mt-2 text-center text-[11px] text-cp-muted">
        Tap to switch between player and host tools
      </p>
    </div>
  );
}
