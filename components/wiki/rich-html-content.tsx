import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { richHtmlClassName, type RichHtmlVariant } from "@/lib/wiki/rich-html-class";
import { cn } from "@/lib/utils";

type RichHtmlContentProps = {
  html: string | null | undefined;
  className?: string;
  /** `article` uses theme-aware styles for public pages; `hero` for text over cover images */
  variant?: RichHtmlVariant;
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
      className={cn(richHtmlClassName(variant), className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
