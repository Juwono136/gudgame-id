import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";

type RichHtmlContentProps = {
  html: string | null | undefined;
  className?: string;
  /** `article` uses theme-aware prose for public wiki pages */
  variant?: "default" | "article";
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
        variant === "article"
          ? "text-cp-muted prose-headings:text-foreground prose-p:text-cp-muted prose-strong:text-foreground dark:prose-invert"
          : "prose-invert text-slate-300 prose-headings:text-foreground",
        "prose-a:text-cp-logo-accent prose-ul:list-disc prose-ol:list-decimal",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
