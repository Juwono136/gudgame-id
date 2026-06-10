"use client";

import { ScrollText } from "lucide-react";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";

type ReclubRulesPanelProps = {
  rulesHtml: string;
  className?: string;
};

/** Single rules block for free reclub sessions — shows exactly what the host entered. */
export function ReclubRulesPanel({ rulesHtml, className }: ReclubRulesPanelProps) {
  if (!rulesHtml.trim()) return null;

  return (
    <section className={className}>
      <div className="rounded-2xl border border-cp-border bg-cp-card p-6">
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <ScrollText className="h-5 w-5 text-emerald-400" />
          Session rules
        </h2>
        <RichHtmlContent html={rulesHtml} variant="article" className="mt-4" />
      </div>
    </section>
  );
}
