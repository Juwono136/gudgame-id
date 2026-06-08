import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";

type RichHtmlContentProps = {
  html: string | null | undefined;
  className?: string;
};

export function RichHtmlContent({ html, className }: RichHtmlContentProps) {
  const safe = sanitizeRichText(html ?? "");
  if (!safe) return null;

  return (
    <div
      className={cn(
        "prose prose-invert max-w-none text-sm leading-relaxed text-slate-300",
        "prose-headings:text-foreground prose-a:text-cp-logo-accent",
        "prose-ul:list-disc prose-ol:list-decimal",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
