"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FooterSocialIcon } from "@/components/layout/footer-social-icon";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { brandAssets, siteConfig } from "@/lib/config/site";
import { resolveSiteImageUrl } from "@/lib/site/resolve-image";
import type { HomepageFooterSettings } from "@/lib/validations/homepage-settings";
import { hasRichTextContent } from "@/lib/wiki/sanitize-rich-text";

type FooterProps = {
  content?: HomepageFooterSettings;
};

function FooterLinkList({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cp-muted">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map(({ href, label }) => (
          <li key={`${label}-${href}`}>
            {href.startsWith("/") ? (
              <Link href={href} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            ) : (
              <a
                href={href}
                className="transition-colors hover:text-foreground"
                {...(href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer({ content }: FooterProps) {
  const logoUrl = resolveSiteImageUrl(content?.logoUrl, brandAssets.logo);
  const logoAlt = content?.logoAlt?.trim() || siteConfig.name;
  const description =
    content?.description ??
    "<p>The leading community knowledge platform for court sports — players, tournaments, gear, and live data.</p>";
  const companyName = content?.companyName ?? "PT Aplikasi Wong Kito Galo";
  const supportEmail = content?.supportEmail ?? "help@gudgame.id";
  const address =
    content?.address ?? "Jl. Limo Raya No. 7, Limo, Kota Depok - Jawa Barat, 16515.";
  const siteColumnTitle = content?.siteColumnTitle ?? "Site";
  const legalColumnTitle = content?.legalColumnTitle ?? "Legal";
  const connectColumnTitle = content?.connectColumnTitle ?? "Connect";
  const siteLinks = content?.siteLinks ?? [
    { href: "/about", label: "About" },
    { href: "/terms", label: "Terms" },
  ];
  const legalLinks = content?.legalLinks ?? [
    { href: "/privacy", label: "Privacy" },
    { href: "/cookies", label: "Cookie Policy" },
  ];
  const socialLinks = content?.socialLinks ?? [
    { platform: "instagram" as const, label: "Instagram", href: "https://instagram.com" },
    { platform: "twitter" as const, label: "Twitter", href: "https://twitter.com" },
  ];
  const copyrightSuffix = content?.copyrightSuffix ?? "Performance Data Aesthetics.";
  const useCustomLogo = Boolean(content?.logoUrl && logoUrl !== brandAssets.logo);

  return (
    <footer className="relative z-0 border-t border-cp-border bg-cp-bg/95 text-sm text-cp-text-dim backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-10">
          <div className="space-y-4 sm:col-span-2 md:col-span-2 lg:col-span-1">
            {useCustomLogo ? (
              <Link
                href="/"
                className="inline-flex items-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cp-primary/50"
              >
                <Image
                  src={logoUrl}
                  alt={logoAlt}
                  width={132}
                  height={40}
                  className="h-8 w-auto max-w-[8.5rem] object-contain object-left sm:h-9 sm:max-w-[9.5rem]"
                />
              </Link>
            ) : (
              <BrandLogo size="sm" className="hover:opacity-100" />
            )}
            {hasRichTextContent(description) ? (
              <RichHtmlContent
                html={description}
                variant="default"
                className="max-w-xs text-cp-muted [&_p]:my-0"
              />
            ) : (
              <p className="max-w-xs leading-relaxed text-cp-muted">{description}</p>
            )}
            <div className="max-w-xs space-y-1 text-xs leading-relaxed text-cp-text-dim">
              <p className="font-medium text-cp-muted">{companyName}</p>
              <p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="transition-colors hover:text-foreground"
                >
                  {supportEmail}
                </a>
              </p>
              <p>{address}</p>
            </div>
          </div>

          <FooterLinkList title={siteColumnTitle} links={siteLinks} />
          <FooterLinkList title={legalColumnTitle} links={legalLinks} />

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cp-muted">
              {connectColumnTitle}
            </h4>
            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={`${link.platform}-${link.href}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-cp-border bg-cp-elevated text-cp-muted transition hover:border-cp-primary/40 hover:bg-cp-primary/10 hover:text-cp-primary"
                    aria-label={link.label}
                    title={link.label}
                  >
                    <FooterSocialIcon platform={link.platform} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-cp-muted">No social links configured.</p>
            )}
          </div>
        </div>

        <p className="mt-10 border-t border-cp-border pt-6 text-center text-xs text-cp-text-dim lg:text-left">
          © {new Date().getFullYear()} {siteConfig.name}. {copyrightSuffix}
        </p>
      </div>
    </footer>
  );
}
