import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type SportDisciplineLabelProps = {
  name: string;
  className?: string;
  /** Compact pill for dense tables; inline for cards */
  variant?: "pill" | "inline";
};

export function SportDisciplineLabel({
  name,
  className,
  variant = "pill",
}: SportDisciplineLabelProps) {
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-cp-muted", className)}>
        <Trophy className="h-3 w-3 shrink-0 text-cp-primary" aria-hidden />
        <span className="font-medium text-foreground">{name}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border border-cp-border/80 bg-cp-elevated/50 px-2 py-0.5 text-[11px] font-medium text-foreground",
        className,
      )}
    >
      <Trophy className="h-3 w-3 shrink-0 text-cp-primary" aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function formatSportNamesList(names: string[]): string {
  if (names.length === 0) return "—";
  return names.join(" · ");
}
