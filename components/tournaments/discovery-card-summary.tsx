"use client";

import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { stripHtmlTags } from "@/lib/html/strip-html";
import { cn } from "@/lib/utils";

type DiscoveryCardSummaryProps = {
  html: string | null | undefined;
  className?: string;
  /**
   * Max preview height. Uses overflow + fade (not line-clamp) so bullet/number
   * lists and other rich-text blocks keep their real formatting.
   */
  maxHeightClass?: string;
};

/**
 * Card preview for tournament description (partner rich-text editor output).
 * Preserves lists, bold, links, headings — clamped by max-height for long content.
 */
export function DiscoveryCardSummary({
  html,
  className,
  maxHeightClass = "max-h-[5.5rem]",
}: DiscoveryCardSummaryProps) {
  const raw = html?.trim() ?? "";
  if (!raw || !stripHtmlTags(raw)) {
    return (
      <p className={cn("min-h-[5.5rem] text-sm text-cp-muted/70", className)}>
        No description yet.
      </p>
    );
  }

  return (
    <div className={cn("relative min-h-[5.5rem]", className)}>
      <div
        className={cn(
          "overflow-hidden text-sm leading-relaxed text-cp-muted",
          maxHeightClass,
          // Compact spacing inside the card while keeping list markers visible.
          "[&_.rich-html]:text-[13px] [&_.rich-html]:leading-relaxed sm:[&_.rich-html]:text-sm",
          "[&_.rich-html_p]:my-1 [&_.rich-html_p:first-child]:mt-0",
          "[&_.rich-html_ul]:my-1 [&_.rich-html_ol]:my-1",
          "[&_.rich-html_ul]:list-disc [&_.rich-html_ol]:list-decimal",
          "[&_.rich-html_ul]:pl-5 [&_.rich-html_ol]:pl-5",
          "[&_.rich-html_li]:my-0.5",
          "[&_.rich-html_h2]:my-1 [&_.rich-html_h2]:text-sm [&_.rich-html_h2]:font-semibold",
          "[&_.rich-html_h3]:my-1 [&_.rich-html_h3]:text-sm [&_.rich-html_h3]:font-semibold",
          "[&_.rich-html_blockquote]:my-1 [&_.rich-html_blockquote]:pl-3",
          "[&_.rich-html_a]:pointer-events-none",
        )}
      >
        <RichHtmlContent html={raw} variant="article" className="!text-cp-muted" />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-cp-card to-transparent"
        aria-hidden
      />
    </div>
  );
}
