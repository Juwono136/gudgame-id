import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PartnerPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  actions,
  /** Stack actions under the title (cleaner on desktop for dense action rows). */
  actionsPlacement = "end",
  actionsClassName,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  actionsPlacement?: "end" | "below";
  actionsClassName?: string;
  className?: string;
}) {
  const stack = actionsPlacement === "below";

  const actionsEl = actions ? (
    <div
      className={cn(
        stack
          ? "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
          : "flex flex-wrap items-center gap-2",
        actionsClassName,
      )}
    >
      {actions}
    </div>
  ) : null;

  return (
    <header className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-4",
          !stack && "sm:flex-row sm:items-end sm:justify-between",
        )}
      >
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cp-primary transition-colors hover:text-cp-primary-light hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {backLabel ?? "Back"}
            </Link>
          ) : null}
          {eyebrow ? (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-muted",
                backHref ? "mt-2" : null,
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl",
              eyebrow || backHref ? "mt-1" : null,
            )}
          >
            {title}
          </h1>
          {description ? (
            <div className="mt-1.5 max-w-2xl text-sm leading-relaxed text-cp-muted break-words">
              {description}
            </div>
          ) : null}
        </div>
        {actionsEl && !stack ? actionsEl : null}
      </div>
      {actionsEl && stack ? actionsEl : null}
    </header>
  );
}
