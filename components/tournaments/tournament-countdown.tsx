"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TournamentCountdownProps = {
  targetDate: string | null;
  label?: string;
  className?: string;
  onComplete?: () => void;
};

function getTimeLeft(target: number) {
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { diff, days, hours, minutes, seconds };
}

export function TournamentCountdown({
  targetDate,
  label = "Registration closes in",
  className,
  onComplete,
}: TournamentCountdownProps) {
  const target = targetDate ? new Date(targetDate).getTime() : null;
  const [left, setLeft] = useState(() =>
    target ? getTimeLeft(target) : { diff: 0, days: 0, hours: 0, minutes: 0, seconds: 0 },
  );

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const next = getTimeLeft(target);
      setLeft(next);
      if (next.diff <= 0) onComplete?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, onComplete]);

  if (!targetDate) return null;

  if (left.diff <= 0) {
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

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">{label}</p>
      <div className="flex gap-2">
        {units.map((u) => (
          <motion.div
            key={u.label}
            className="flex min-w-[52px] flex-col items-center rounded-lg border border-cp-border bg-cp-elevated/80 px-2 py-2"
            animate={{ scale: u.label === "Sec" ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-xl font-bold tabular-nums text-foreground">
              {String(u.value).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase text-cp-muted">{u.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
