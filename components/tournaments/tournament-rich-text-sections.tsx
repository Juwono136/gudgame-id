"use client";

import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { ReclubRulesPanel } from "@/components/tournaments/reclub-rules-panel";
import { TournamentRulesAccordion } from "@/components/tournaments/tournament-rules-accordion";
import { getTournamentRuleSections } from "@/lib/tournaments/settings";
import type { TournamentGearRuleItem } from "@/lib/tournaments/gear-for-rules";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { hasRichTextContent } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";

type TournamentRichTextSectionsProps = {
  tournament: TournamentDetail;
  gearItems?: TournamentGearRuleItem[];
  className?: string;
  showSummary?: boolean;
};

function ContentSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function TournamentRichTextSections({
  tournament,
  gearItems = [],
  className,
  showSummary = true,
}: TournamentRichTextSectionsProps) {
  const isOfficial = tournament.tournamentType === "official";
  const ruleSections = getTournamentRuleSections(tournament);

  const hasDescription = hasRichTextContent(tournament.description);
  const hasSummary = showSummary && hasRichTextContent(tournament.summary);
  const hasReclubRules = !isOfficial && hasRichTextContent(tournament.rules);
  const hasOfficialRules =
    isOfficial &&
    Boolean(
      hasRichTextContent(ruleSections.matchFormatHtml) ||
        hasRichTextContent(ruleSections.equipmentStandardsHtml) ||
        gearItems.length > 0,
    );

  if (!hasSummary && !hasDescription && !hasReclubRules && !hasOfficialRules) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {hasSummary ? (
        <ContentSection title="Summary">
          <RichHtmlContent html={tournament.summary} variant="article" />
        </ContentSection>
      ) : null}

      {hasDescription ? (
        <ContentSection title={isOfficial ? "About this tournament" : "About this session"}>
          <RichHtmlContent html={tournament.description} variant="article" />
        </ContentSection>
      ) : null}

      {hasOfficialRules ? (
        <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
          <TournamentRulesAccordion
            matchFormatHtml={ruleSections.matchFormatHtml}
            equipmentStandardsHtml={ruleSections.equipmentStandardsHtml}
            format={tournament.format}
            sportSlug={tournament.sportSlug}
            gearItems={gearItems}
          />
        </div>
      ) : null}

      {hasReclubRules ? <ReclubRulesPanel rulesHtml={tournament.rules!} /> : null}
    </div>
  );
}
