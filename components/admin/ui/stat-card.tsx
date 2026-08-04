import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-cp-border bg-cp-card p-3.5 shadow-sm sm:p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-cp-muted">
          {label}
        </p>
        {Icon ? (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cp-primary/10 text-cp-primary sm:h-8 sm:w-8">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.75rem]">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <div className="mt-auto pt-1.5">
        {trend ? (
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {trend}
          </p>
        ) : null}
        {hint ? <p className="text-[11px] leading-snug text-cp-muted">{hint}</p> : null}
        {children}
      </div>
    </div>
  );
}
