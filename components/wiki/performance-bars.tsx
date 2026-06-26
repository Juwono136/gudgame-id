import { cn } from "@/lib/utils";

type PerformanceBarsProps = {
  metrics: { label: string; value: number; max?: number }[];
  className?: string;
};

export function PerformanceBars({ metrics, className }: PerformanceBarsProps) {
  if (metrics.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {metrics.map((m) => {
        const max = m.max ?? 100;
        const pct = Math.min(100, Math.round((m.value / max) * 100));
        return (
          <div key={m.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-cp-muted">{m.label}</span>
              <span className="font-semibold text-cp-logo-accent">
                {m.value}
                <span className="text-cp-muted"> / {max}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cp-elevated">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cp-primary to-cp-logo-accent transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
