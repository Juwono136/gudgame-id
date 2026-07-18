import { cn } from "@/lib/utils";

/** Red asterisk for required form fields (accessible via aria when paired with inputs). */
export function RequiredMark({ className }: { className?: string }) {
  return (
    <span className={cn("ml-0.5 font-semibold text-red-500 dark:text-red-400", className)} aria-hidden>
      *
    </span>
  );
}

export function FieldError({
  id,
  message,
  className,
}: {
  id?: string;
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn("mt-1.5 text-xs font-medium text-red-600 dark:text-red-400", className)}
    >
      {message}
    </p>
  );
}
