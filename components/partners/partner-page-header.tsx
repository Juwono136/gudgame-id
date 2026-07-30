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
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
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
              "text-xs font-semibold uppercase tracking-wider text-cp-muted",
              backHref ? "mt-2" : null,
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-foreground sm:text-3xl",
            eyebrow || backHref ? "mt-1" : null,
          )}
        >
          {title}
        </h1>
        {description ? (
          <div className="mt-1 max-w-3xl text-sm text-cp-muted">{description}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
