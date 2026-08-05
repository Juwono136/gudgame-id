"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Clock3,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FadeIn, FadeInView } from "@/components/motion/fade-in";
import { ContactGoogleMap } from "@/components/sections/contact-google-map";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { Button } from "@/components/ui/button";
import { resolveSiteImageUrl } from "@/lib/site/resolve-image";
import { siteConfig } from "@/lib/config/site";
import type { HomepageContactSettings } from "@/lib/validations/homepage-settings";
import { hasRichTextContent } from "@/lib/wiki/sanitize-rich-text";

type ContactPageContentProps = {
  content: HomepageContactSettings;
};

function ContactChannel({
  icon: Icon,
  label,
  value,
  href,
  hint,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
  hint?: string;
}) {
  return (
    <div className="group rounded-2xl border border-cp-border bg-cp-card p-4 shadow-sm transition-colors hover:border-cp-primary/35 hover:bg-cp-primary/[0.04] sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/12 text-cp-primary sm:h-11 sm:w-11">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
            {label}
          </p>
          {href ? (
            <a
              href={href}
              className="mt-1 block break-words text-sm font-semibold text-foreground transition-colors hover:text-cp-primary sm:text-base"
              {...(href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {value}
            </a>
          ) : (
            <p className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">
              {value}
            </p>
          )}
          {hint ? <p className="mt-1 text-xs leading-relaxed text-cp-muted">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ContactPageContent({ content }: ContactPageContentProps) {
  const bannerUrl = resolveSiteImageUrl(content.bannerImageUrl, "/images/bg-03.jpg");
  const phone = content.phone?.trim();
  const hours = content.officeHours?.trim();
  const mapsUrl = content.mapsUrl?.trim();
  const websiteUrl = content.websiteUrl?.trim();
  const legalName = content.companyLegalName?.trim() || siteConfig.name;
  const productName = content.productName?.trim() || siteConfig.name;
  const emailHint = content.emailHint?.trim();

  return (
    <div className="pb-16 sm:pb-20 md:pb-24">
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
            className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-cp-bg to-transparent"
            aria-hidden
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:px-8">
          <FadeIn>
            <p className="inline-flex items-center gap-2 rounded-full border border-cp-primary/30 bg-cp-card/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cp-primary backdrop-blur-md sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {content.badgeText}
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:mt-4 sm:text-4xl md:text-5xl">
              {content.title}
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-cp-muted sm:mt-3 sm:text-base md:text-lg">
              {content.subtitle}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 xl:gap-10">
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <FadeInView>
              <div className="rounded-2xl border border-cp-border bg-cp-card p-5 shadow-sm sm:rounded-[1.75rem] sm:p-7 md:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/12 text-cp-primary sm:h-11 sm:w-11">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cp-primary sm:text-xs">
                      {content.introCardTitle}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-cp-muted">
                      {content.introCardSubtitle}
                    </p>
                  </div>
                </div>

                {hasRichTextContent(content.description) ? (
                  <RichHtmlContent
                    html={content.description}
                    variant="article"
                    className="mt-5 text-sm sm:mt-6 sm:text-base [&_p]:text-cp-muted [&_p+p]:mt-3"
                  />
                ) : (
                  <p className="mt-5 text-sm leading-relaxed text-cp-muted sm:mt-6 sm:text-base">
                    {content.description}
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                  <Button asChild size="lg" className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto">
                    <a href={`mailto:${content.supportEmail}`}>{content.ctaLabel}</a>
                  </Button>
                  {mapsUrl ? (
                    <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                        {content.mapsCtaLabel}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </FadeInView>

            {mapsUrl ? (
              <FadeInView delay={0.04}>
                <ContactGoogleMap
                  mapsUrl={mapsUrl}
                  title={content.mapsSectionTitle}
                  openLabel={content.mapsCtaLabel}
                />
              </FadeInView>
            ) : null}

            <FadeInView delay={0.06}>
              <div className="rounded-2xl border border-cp-border bg-cp-elevated/45 p-5 sm:rounded-[1.75rem] sm:p-7 md:p-8">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-cp-primary" aria-hidden />
                  <h2 className="text-base font-semibold text-foreground sm:text-lg">
                    {content.legalSectionTitle}
                  </h2>
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                      Company name
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">{legalName}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                      Product
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">{productName}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                      Support email
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">
                      <a
                        href={`mailto:${content.supportEmail}`}
                        className="hover:text-cp-primary"
                      >
                        {content.supportEmail}
                      </a>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                      Registered address
                    </dt>
                    <dd className="mt-1 leading-relaxed text-foreground">{content.address}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-cp-border pt-5 text-sm">
                  <Link href="/privacy" className="text-cp-primary hover:underline">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="text-cp-primary hover:underline">
                    Terms of Service
                  </Link>
                  <Link href="/about" className="text-cp-muted hover:text-foreground">
                    About {productName}
                  </Link>
                </div>
              </div>
            </FadeInView>
          </div>

          <FadeInView delay={0.08}>
            <div className="space-y-3 sm:space-y-4 lg:sticky lg:top-24">
              <ContactChannel
                icon={Mail}
                label="Email"
                value={content.supportEmail}
                href={`mailto:${content.supportEmail}`}
                hint={emailHint || undefined}
              />
              {phone ? (
                <ContactChannel
                  icon={Phone}
                  label="Phone"
                  value={phone}
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                />
              ) : null}
              <ContactChannel icon={MapPin} label="Address" value={content.address} />
              {hours ? (
                <ContactChannel icon={Clock3} label="Office hours" value={hours} />
              ) : null}
              {websiteUrl ? (
                <ContactChannel
                  icon={Globe2}
                  label="Website"
                  value={websiteUrl.replace(/^https?:\/\//, "")}
                  href={websiteUrl}
                />
              ) : null}
            </div>
          </FadeInView>
        </div>
      </section>
    </div>
  );
}
