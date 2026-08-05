"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { GlobalSearchBox } from "@/components/search/global-search-box";
import { brandAssets, siteConfig } from "@/lib/config/site";
import { resolveSiteImageUrl } from "@/lib/site/resolve-image";
import type { HomepageHeroSettings } from "@/lib/validations/homepage-settings";

type HeroProps = {
  content?: HomepageHeroSettings;
};

export default function Hero({ content }: HeroProps) {
  const pathname = usePathname();
  const badgeText = content?.badgeText ?? "The Official Community Hub";
  const logoUrl = resolveSiteImageUrl(content?.logoUrl, brandAssets.logo);
  const logoAlt = content?.logoAlt?.trim() || siteConfig.name;
  const bannerUrl = resolveSiteImageUrl(content?.bannerImageUrl, "/images/bg-03.jpg");
  const bannerAlt = content?.bannerAlt?.trim() ?? "";
  const title = content?.title ?? "Super sports app";
  const titleHighlight = content?.titleHighlight ?? "database and match maker";
  const subtitle =
    content?.subtitle ??
    "Player profiles, gear specs, and tournament coverage — all in one place.";
  const searchPlaceholder =
    content?.searchPlaceholder ?? "Search players, gear, tournaments, news…";

  return (
    <section className="relative z-10 min-h-[min(42vh,380px)] sm:min-h-[min(44vh,420px)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={bannerUrl}
          alt={bannerAlt}
          fill
          priority
          loading="eager"
          fetchPriority="high"
          className="object-cover object-center brightness-[0.92] contrast-[1.02] saturate-[0.95] dark:brightness-[0.72] dark:contrast-100 dark:saturate-100"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-linear-to-b from-white/92 via-white/78 to-cp-bg dark:from-black/70 dark:via-black/55 dark:to-cp-bg"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[var(--cp-hero-overlay)]/6 dark:bg-[var(--cp-hero-overlay)]/20"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(10,158,118,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(61,186,150,0.14),transparent)]"
          aria-hidden
        />
      </div>

      <div className="relative flex min-h-[inherit] items-center overflow-visible">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-xl text-center lg:text-left">
              <FadeIn mountKey={`hero-badge-${pathname}`} delay={0}>
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cp-primary/25 bg-cp-primary/10 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-cp-primary backdrop-blur-sm sm:px-4 sm:text-[11px] dark:border-cp-primary/30 dark:bg-cp-primary/15 dark:text-cp-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cp-primary opacity-55" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cp-primary" />
                  </span>
                  {badgeText}
                </div>
              </FadeIn>

              <FadeIn mountKey={`hero-logo-${pathname}`} delay={0.04}>
                <div className="mt-4 flex justify-center lg:justify-start">
                  <div className="relative inline-flex items-center justify-center">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.55)_38%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(2,8,16,0.92)_0%,rgba(2,8,16,0.5)_40%,transparent_72%)]"
                    />
                    <Image
                      src={logoUrl}
                      alt={logoAlt}
                      width={280}
                      height={88}
                      priority
                      className="relative z-[1] h-10 w-auto object-contain [filter:drop-shadow(0_1px_0_rgba(255,255,255,0.95))_drop-shadow(0_2px_10px_rgba(15,23,42,0.22))] sm:h-12 md:h-[3.25rem] dark:[filter:drop-shadow(0_1px_0_rgba(0,0,0,0.75))_drop-shadow(0_0_14px_rgba(61,186,150,0.35))_drop-shadow(0_3px_12px_rgba(0,0,0,0.55))]"
                      sizes="(max-width: 640px) 156px, 210px"
                    />
                  </div>
                </div>
              </FadeIn>

              <FadeIn mountKey={`hero-title-${pathname}`} delay={0.08}>
                <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-cp-text drop-shadow-[0_1px_12px_rgba(255,255,255,0.65)] sm:mt-4 sm:text-3xl md:text-[2rem] dark:text-white dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)]">
                  {title}
                  {titleHighlight ? (
                    <>
                      {" "}
                      <span className="text-cp-primary">{titleHighlight}</span>
                    </>
                  ) : null}
                </h1>
              </FadeIn>

              <FadeIn mountKey={`hero-desc-${pathname}`} delay={0.14}>
                <p className="mt-2 text-sm leading-relaxed text-cp-muted sm:mt-3 sm:text-[15px] dark:text-slate-300 dark:drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
                  {subtitle}
                </p>
              </FadeIn>
            </div>

            <div className="relative z-20 w-full lg:max-w-md lg:shrink-0">
              <FadeIn mountKey={`hero-search-${pathname}`} delay={0.18}>
                <GlobalSearchBox
                  variant="hero"
                  placeholder={searchPlaceholder}
                  className="shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                />
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
