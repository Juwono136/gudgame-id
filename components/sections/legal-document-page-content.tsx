"use client";

import Link from "next/link";
import { ArrowLeft, Scale, Sparkles } from "lucide-react";
import { FadeIn, FadeInView } from "@/components/motion/fade-in";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { Button } from "@/components/ui/button";
import type { HomepageLegalDocumentSettings } from "@/lib/validations/homepage-settings";
import { hasRichTextContent } from "@/lib/wiki/sanitize-rich-text";

type LegalDocumentPageContentProps = {
  content: HomepageLegalDocumentSettings;
  relatedHref?: string;
  relatedLabel?: string;
};

export function LegalDocumentPageContent({
  content,
  relatedHref,
  relatedLabel,
}: LegalDocumentPageContentProps) {
  const lastUpdated = content.lastUpdatedLabel?.trim();

  return (
    <div className="pb-16 sm:pb-20 md:pb-24">
      <section className="relative overflow-hidden border-b border-cp-border/80 bg-linear-to-br from-cp-primary/10 via-cp-bg to-cp-elevated/60 dark:from-cp-primary/15 dark:via-cp-bg dark:to-cp-elevated/40">
        <div
          className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-cp-primary/15 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:px-8">
          <FadeIn>
            <p className="inline-flex items-center gap-2 rounded-full border border-cp-primary/30 bg-cp-card/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cp-primary backdrop-blur-md sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {content.badgeText}
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:mt-4 sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
              {content.title}
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-cp-muted sm:mt-3 sm:text-base">
              {content.subtitle}
            </p>
            {lastUpdated ? (
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cp-muted sm:text-sm">
                <Scale className="h-3.5 w-3.5 text-cp-primary" aria-hidden />
                {lastUpdated}
              </p>
            ) : null}
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <FadeInView>
          <article className="mt-8 rounded-2xl border border-cp-border bg-cp-card p-5 shadow-sm sm:mt-10 sm:rounded-[1.75rem] sm:p-8 md:p-10">
            {hasRichTextContent(content.body) ? (
              <RichHtmlContent
                html={content.body}
                variant="article"
                className="legal-prose text-sm leading-relaxed sm:text-base [&_a]:text-cp-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground sm:[&_h2]:text-xl [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_li]:text-cp-muted [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:text-cp-muted [&_p+p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
              />
            ) : (
              <p className="text-sm leading-relaxed text-cp-muted sm:text-base">{content.body}</p>
            )}
          </article>
        </FadeInView>

        <FadeInView delay={0.05}>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              {relatedHref && relatedLabel ? (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={relatedHref}>{relatedLabel}</Link>
                </Button>
              ) : null}
              <Button asChild className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </FadeInView>
      </section>
    </div>
  );
}
