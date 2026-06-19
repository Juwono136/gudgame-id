"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentGearRuleItem } from "@/lib/tournaments/gear-for-rules";
import { cn } from "@/lib/utils";

type AccordionItem = {
  id: string;
  title: string;
  html: string;
  gearItems?: TournamentGearRuleItem[];
};

type TournamentRulesAccordionProps = {
  eligibilityHtml?: string | null;
  matchFormatHtml?: string | null;
  equipmentStandardsHtml?: string | null;
  format?: string;
  categoryLabel?: string | null;
  sportName?: string;
  sportSlug?: string;
  gearItems?: TournamentGearRuleItem[];
};

function defaultEligibility(
  categoryLabel: string | null | undefined,
  sportName: string | undefined,
): string {
  return [
    categoryLabel ? `<p><strong>Category:</strong> ${categoryLabel}</p>` : "",
    `<p>Open to registered ${sportName ?? "sport"} players on TandingBase with a verified account.</p>`,
    "<p>Age and skill requirements follow the organizer rules below.</p>",
  ]
    .filter(Boolean)
    .join("");
}

function defaultMatchFormat(format: string | undefined): string {
  return `<p>Tournament format: <strong>${(format ?? "single_elimination").replace(/_/g, " ")}</strong>.</p><p>Match rules will be announced by the host before play begins.</p>`;
}

function defaultEquipment(): string {
  return "<p>Players must use sport-appropriate equipment. The organizer may inspect gear before matches. Non-compliant equipment may result in disqualification.</p>";
}

export function TournamentRulesAccordion({
  eligibilityHtml,
  matchFormatHtml,
  equipmentStandardsHtml,
  format,
  categoryLabel,
  sportName,
  sportSlug,
  gearItems = [],
}: TournamentRulesAccordionProps) {
  const items: AccordionItem[] = [
    {
      id: "eligibility",
      title: "Eligibility & categories",
      html: eligibilityHtml?.trim() || defaultEligibility(categoryLabel, sportName),
    },
    {
      id: "format",
      title: "Match format",
      html: matchFormatHtml?.trim() || defaultMatchFormat(format),
    },
    {
      id: "equipment",
      title: "Equipment standards",
      html: equipmentStandardsHtml?.trim() || defaultEquipment(),
      gearItems,
    },
  ];

  const [openId, setOpenId] = useState<string>("eligibility");

  return (
    <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <h2 className="font-semibold text-foreground">Tournament rules</h2>
      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <li key={item.id} className="overflow-hidden rounded-xl border border-cp-border">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? "" : item.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-cp-elevated/50"
              >
                {item.title}
                <ChevronDown
                  className={cn("h-4 w-4 text-cp-muted transition-transform", isOpen && "rotate-180")}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-cp-border"
                  >
                    <div className="bg-cp-elevated/20 px-4 py-3">
                      <RichHtmlContent html={item.html} variant="article" />
                      {item.gearItems?.length ? (
                        <ul className="mt-4 space-y-2 border-t border-cp-border pt-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                            Approved equipment from wiki
                          </p>
                          {item.gearItems.map((gear) => (
                            <li key={gear.id}>
                              {sportSlug ? (
                                <Link
                                  href={publicSportRoutes.gearItem(sportSlug, gear.slug)}
                                  className="text-sm font-medium text-cp-primary hover:underline"
                                >
                                  {gear.displayName}
                                </Link>
                              ) : (
                                <span className="text-sm font-medium text-foreground">
                                  {gear.displayName}
                                </span>
                              )}
                              {gear.summary ? (
                                <p className="mt-0.5 text-xs text-cp-muted line-clamp-2">
                                  {gear.summary}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
