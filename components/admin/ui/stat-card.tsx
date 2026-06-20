import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  className?: string;
  children?: React.ReactNode;
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-cp-border bg-cp-card/60 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-5",
        className,
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-widest text-cp-muted sm:text-[10px]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-foreground sm:mt-2 sm:text-3xl">{value}</p>
      {trend ? (
        <p className="mt-1 text-xs font-medium text-emerald-400">{trend}</p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-cp-muted">{hint}</p> : null}
      {children}
    </div>
  );
}
