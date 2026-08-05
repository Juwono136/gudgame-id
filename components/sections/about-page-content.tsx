import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { FadeIn, FadeInView } from "@/components/motion/fade-in";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { Button } from "@/components/ui/button";
import { resolveSiteImageUrl } from "@/lib/site/resolve-image";
import type { HomepageAboutSettings } from "@/lib/validations/homepage-settings";
import { hasRichTextContent } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";

type AboutPageContentProps = {
  content: HomepageAboutSettings;
};

export function AboutPageContent({ content }: AboutPageContentProps) {
  const bannerUrl = resolveSiteImageUrl(content.bannerImageUrl, "/images/bg-03.jpg");
  const featureUrl = content.imageUrl?.trim()
    ? resolveSiteImageUrl(content.imageUrl, "")
    : null;

  return (
    <div className="pb-20 sm:pb-24">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src={bannerUrl}
            alt={content.bannerAlt || ""}
            fill
            priority
            loading="eager"
            fetchPriority="high"
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-linear-to-br from-cp-bg/95 via-cp-bg/88 to-cp-primary/20 dark:from-black/90 dark:via-black/75 dark:to-cp-primary/25"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-cp-bg to-transparent"
            aria-hidden
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 md:py-14 lg:px-8">
          <FadeIn>
            <p className="inline-flex items-center gap-2 rounded-full border border-cp-primary/30 bg-cp-card/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cp-primary backdrop-blur-md sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {content.badgeText}
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:mt-5 sm:text-4xl md:text-5xl md:leading-[1.1]">
              {content.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cp-muted sm:mt-4 sm:text-base md:text-lg">
              {content.subtitle}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "grid items-start gap-10 lg:gap-14",
            featureUrl ? "lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : "",
          )}
        >
          {featureUrl ? (
            <FadeInView>
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-[2rem] bg-cp-primary/10 blur-2xl dark:bg-cp-primary/15"
                  aria-hidden
                />
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-cp-border bg-cp-elevated shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] sm:aspect-[4/3] lg:aspect-[4/5]">
                  <Image
                    src={featureUrl}
                    alt={content.imageAlt || content.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 44vw"
                  />
                </div>
              </div>
            </FadeInView>
          ) : null}

          <FadeInView delay={0.06}>
            <div className={cn(!featureUrl && "mx-auto max-w-3xl")}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cp-primary">
                Who we are
              </p>
              {hasRichTextContent(content.description) ? (
                <RichHtmlContent
                  html={content.description}
                  variant="article"
                  className="mt-4 text-base leading-relaxed sm:text-[1.05rem] [&_p]:text-cp-muted [&_p+p]:mt-4"
                />
              ) : (
                <p className="mt-4 text-base leading-relaxed text-cp-muted">{content.description}</p>
              )}
            </div>
          </FadeInView>
        </div>

        <FadeInView delay={0.08}>
          <div className="relative mt-14 overflow-hidden rounded-[1.75rem] border border-cp-primary/25 bg-linear-to-br from-cp-primary/12 via-cp-card to-cp-elevated p-7 sm:mt-18 sm:p-10">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cp-primary/20 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-primary/15 text-cp-primary">
                  <Compass className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-cp-primary">
                  {content.missionTitle}
                </p>
                <p className="mt-3 text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                  {content.missionBody}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-cp-primary hover:bg-cp-primary-light">
                  <Link href="/contact">
                    Contact Us
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/">Explore homepage</Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeInView>
      </section>
    </div>
  );
}
