import { cn } from "@/lib/utils";

type FieldCharCounterProps = {
  current: number;
  max: number;
  className?: string;
};

export function FieldCharCounter({ current, max, className }: FieldCharCounterProps) {
  const ratio = max > 0 ? current / max : 0;
  const nearLimit = ratio >= 0.9;

  return (
    <p
      className={cn(
        "text-right text-xs tabular-nums",
        nearLimit ? "text-amber-600 dark:text-amber-400" : "text-cp-muted",
        className,
      )}
      aria-live="polite"
    >
      {current.toLocaleString()} / {max.toLocaleString()}
    </p>
  );
}
