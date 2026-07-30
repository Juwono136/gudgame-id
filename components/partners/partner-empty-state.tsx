import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { CalendarDays } from "lucide-react";

export function PartnerEmptyState({
  title,
  description,
  icon: Icon = CalendarDays,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-10 text-center sm:px-6 sm:py-14",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cp-border bg-cp-elevated/60 text-cp-primary sm:h-12 sm:w-12">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1 px-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-cp-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 w-full max-w-xs sm:w-auto">{action}</div> : null}
    </div>
  );
}
