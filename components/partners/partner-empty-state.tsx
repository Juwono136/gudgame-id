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
        "flex flex-col items-center justify-center gap-3 px-4 py-14 text-center sm:px-6",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cp-border bg-cp-elevated/60 text-cp-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-cp-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
