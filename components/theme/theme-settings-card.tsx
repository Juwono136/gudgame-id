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

export function ThemeSettingsCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Appearance</h2>
      <p className="mt-1 text-sm text-cp-muted">
        Choose how TandingBase looks on this device.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, description, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-cp-primary bg-cp-primary/10"
                  : "border-cp-border bg-cp-elevated/50 hover:border-cp-primary/40",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active ? "text-cp-primary" : "text-cp-muted",
                )}
              />
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className="text-xs leading-relaxed text-cp-muted">{description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
