"use client";

import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";
import { cn } from "@/lib/utils";

type TournamentReviewRichBlockProps = {
  label: string;
  html: string;
  className?: string;
  containerClassName?: string;
};

/** Sanitized rich-text preview for tournament create/edit review steps. */
export function TournamentReviewRichBlock({
  label,
  html,
  className,
  containerClassName,
}: TournamentReviewRichBlockProps) {
  if (!stripHtmlToText(html)) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-cp-border/60 bg-cp-elevated/20 p-3",
        containerClassName,
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">{label}</p>
      <RichHtmlContent
        html={html}
        variant="article"
        className="mt-2 text-foreground/90 [&_strong]:text-foreground"
      />
    </div>
  );
}
