"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ThemeSetting = "light" | "dark" | "system";

const OPTIONS: { value: ThemeSetting; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

type ThemeToggleProps = {
  className?: string;
  align?: "start" | "center" | "end";
};

export function ThemeToggle({ className, align = "end" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const ActiveIcon =
    !mounted || theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 shrink-0 text-cp-muted hover:bg-cp-elevated hover:text-foreground",
            className,
          )}
          aria-label="Change color theme"
        >
          {mounted ? (
            <ActiveIcon className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[9rem] border-cp-border bg-cp-card">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "cursor-pointer gap-2 text-foreground focus:bg-cp-elevated focus:text-foreground",
              theme === value && "bg-cp-primary/10 font-medium text-cp-primary",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline menu items for embedding inside another dropdown */
export function ThemeToggleMenuItems() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "cursor-pointer gap-2",
            theme === value && "bg-cp-primary/10 font-medium",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </DropdownMenuItem>
      ))}
    </>
  );
}
