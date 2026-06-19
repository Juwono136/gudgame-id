import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";

type RichHtmlContentProps = {
  html: string | null | undefined;
  className?: string;
  /** `article` uses theme-aware prose for public wiki pages; `hero` for text over cover images */
  variant?: "default" | "article" | "hero";
};

export function RichHtmlContent({
  html,
  className,
  variant = "default",
}: RichHtmlContentProps) {
  const safe = sanitizeRichText(html ?? "");
  if (!safe) return null;

  return (
    <div
      className={cn(
        "prose max-w-none text-sm leading-relaxed",
        variant === "hero"
          ? "text-foreground/90 prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground drop-shadow-sm dark:prose-invert"
          : variant === "article"
            ? "text-cp-muted prose-headings:text-foreground prose-p:text-cp-muted prose-strong:text-foreground dark:prose-invert"
            : "prose-invert text-slate-300 prose-headings:text-foreground",
        "prose-a:text-cp-logo-accent prose-ul:list-disc prose-ol:list-decimal",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
