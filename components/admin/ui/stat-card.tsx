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
        "rounded-2xl border border-cp-border bg-cp-card/60 p-5 backdrop-blur-sm",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-cp-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {trend ? (
        <p className="mt-1 text-xs font-medium text-emerald-400">{trend}</p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-cp-muted">{hint}</p> : null}
      {children}
    </div>
  );
}
