import { cn } from "@/lib/utils";

type PlayerPageCardProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "highlight";
};

export function PlayerPageCard({
  title,
  description,
  action,
  children,
  className,
  variant = "default",
}: PlayerPageCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-5 sm:p-6 cp-shadow-card",
        variant === "highlight"
          ? "border-cp-primary/25 bg-cp-primary/5 dark:border-cp-primary/30 dark:bg-cp-primary/10"
          : "border-cp-border bg-cp-card",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-cp-muted sm:text-sm">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
