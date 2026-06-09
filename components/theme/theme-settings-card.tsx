"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ThemeSetting } from "@/components/theme/theme-toggle";

const OPTIONS: {
  value: ThemeSetting;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces for daytime use",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-glare layout for evening sessions",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device appearance",
    icon: Monitor,
  },
];

type ThemeSettingsCardProps = {
  variant?: "default" | "settings";
};

export function ThemeSettingsCard({ variant = "default" }: ThemeSettingsCardProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isSettings = variant === "settings";

  return (
    <div
      className={cn(
        "rounded-2xl border border-cp-border bg-cp-card/70 shadow-sm backdrop-blur-sm",
        isSettings ? "p-5 sm:p-6" : "p-5 sm:p-6",
      )}
    >
      <h2 className="text-base font-semibold text-foreground sm:text-lg">Appearance</h2>
      <p className="mt-1 text-sm text-cp-muted">
        Choose how TandingBase looks on this device.
      </p>

      <div
        className={cn(
          "mt-4 grid gap-2",
          isSettings ? "sm:grid-cols-3" : "sm:grid-cols-3",
        )}
      >
        {OPTIONS.map(({ value, label, description, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "btn-interactive flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all sm:p-4",
                isSettings ? "flex-row sm:flex-col sm:items-start" : "flex-col",
                active
                  ? "border-cp-primary bg-cp-primary/10 shadow-[0_0_0_1px_rgba(0,71,255,0.15)]"
                  : "border-cp-border bg-cp-elevated/50 hover:border-cp-primary/40",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-cp-primary" : "text-cp-muted",
                )}
              />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-cp-muted">
                  {description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
