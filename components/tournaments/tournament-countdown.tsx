"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TournamentCountdownProps = {
  targetDate: string | null;
  label?: string;
  className?: string;
  onComplete?: () => void;
  /** Brighter labels for use on hero banners over cover images */
  tone?: "default" | "hero";
};

function getTimeLeft(target: number) {
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { diff, days, hours, minutes, seconds };
}

const PLACEHOLDER = { diff: 1, days: 0, hours: 0, minutes: 0, seconds: 0 };

export function TournamentCountdown({
  targetDate,
  label = "Registration closes in",
  className,
  onComplete,
  tone = "default",
}: TournamentCountdownProps) {
  const target = targetDate ? new Date(targetDate).getTime() : null;
  const [mounted, setMounted] = useState(false);
  const [left, setLeft] = useState(PLACEHOLDER);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!target || !mounted) return;
    const tick = () => {
      const next = getTimeLeft(target);
      setLeft(next);
      if (next.diff <= 0) onComplete?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, onComplete, mounted]);

  if (!targetDate) return null;

  if (mounted && left.diff <= 0) {
    return (
      <p className={cn("text-sm font-medium text-amber-400", className)}>Closed</p>
    );
  }

  const units = [
    { value: left.days, label: "Days" },
    { value: left.hours, label: "Hrs" },
    { value: left.minutes, label: "Min" },
    { value: left.seconds, label: "Sec" },
  ];

  const isHero = tone === "hero";

  return (
    <div className={cn("space-y-2", className)}>
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider",
          isHero ? "text-foreground/85 drop-shadow-sm" : "text-cp-muted",
        )}
      >
        {label}
      </p>
      <div className="flex gap-2">
        {units.map((u) => (
          <motion.div
            key={u.label}
            className={cn(
              "flex min-w-[52px] flex-col items-center rounded-lg border px-2 py-2",
              isHero
                ? "border-white/15 bg-cp-bg/55 backdrop-blur-sm"
                : "border-cp-border bg-cp-elevated/80",
            )}
            animate={mounted && u.label === "Sec" ? { scale: [1, 1.02, 1] } : undefined}
            transition={{ duration: 0.3 }}
          >
            <span className="text-xl font-bold tabular-nums text-foreground" suppressHydrationWarning>
              {mounted ? String(u.value).padStart(2, "0") : "--"}
            </span>
            <span
              className={cn(
                "text-[9px] uppercase",
                isHero ? "text-foreground/75" : "text-cp-muted",
              )}
            >
              {u.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
