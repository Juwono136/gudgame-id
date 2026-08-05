import { cn } from "@/lib/utils";

export type RichHtmlVariant = "default" | "article" | "hero";

/** Shared rich HTML styles — Tailwind preflight strips list markers without this. */
export function richHtmlClassName(variant: RichHtmlVariant = "default", className?: string) {
  return cn(
    "rich-html max-w-none text-sm leading-relaxed",
    // Inline images from CMS / wiki editors
    "[&_img]:my-4 [&_img]:max-h-[28rem] [&_img]:w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-cp-border [&_img]:object-cover",
    "[&_figure]:my-5 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-cp-muted",
    variant === "hero"
      ? "text-foreground/90"
      : variant === "article"
        ? "text-cp-muted"
        : // Theme-aware default (avoid slate-300 which breaks light mode partner pages)
          "text-foreground/85",
    className,
  );
}
