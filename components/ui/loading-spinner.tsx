import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

export function LoadingSpinner({
  className,
  label = "Loading",
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      role="status"
      aria-label={label}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-[var(--cp-primary)] border-t-transparent",
          sizeMap[size],
        )}
      />
      {label ? (
        <p className="text-sm font-medium text-cp-muted">{label}</p>
      ) : null}
    </div>
  );
}

export function PageLoader({ message = `Loading ${siteConfig.name}...` }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center px-4">
      <LoadingSpinner size="lg" label={message} />
    </div>
  );
}
