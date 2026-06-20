import { cn } from "@/lib/utils";

export type RichHtmlVariant = "default" | "article" | "hero";

/** Shared rich HTML styles — Tailwind preflight strips list markers without this. */
export function richHtmlClassName(variant: RichHtmlVariant = "default", className?: string) {
  return cn(
    "rich-html max-w-none text-sm leading-relaxed",
    variant === "hero"
      ? "text-foreground/90"
      : variant === "article"
        ? "text-cp-muted"
        : "text-slate-300",
    className,
  );
}
