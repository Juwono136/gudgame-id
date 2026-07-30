"use client";

import Link from "next/link";
import { Share2, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { siteConfig } from "@/lib/config";

const wikiLinks = [
  { href: "/about", label: "About" },
  { href: "/community", label: "Community" },
  { href: "/terms", label: "Terms" },
] as const;

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookie Policy" },
] as const;

export default function Footer() {
  return (
    <footer className="relative z-0 border-t border-cp-border bg-cp-bg/95 text-sm text-cp-text-dim backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-10">
          <div className="space-y-4 sm:col-span-2 md:col-span-2 lg:col-span-1">
            <BrandLogo size="sm" className="hover:opacity-100" />
            <p className="max-w-xs leading-relaxed text-cp-muted">
              The leading community knowledge platform for court sports — players,
              tournaments, gear, and live data.
            </p>
            <div className="max-w-xs space-y-1 text-xs leading-relaxed text-cp-text-dim">
              <p className="font-medium text-cp-muted">PT Aplikasi Wong Kito Galo</p>
              <p>
                <a
                  href="mailto:help@gudgame.id"
                  className="transition-colors hover:text-foreground"
                >
                  help@gudgame.id
                </a>
              </p>
              <p>
                Jl. Limo Raya No. 7, Limo, Kota Depok - Jawa Barat, 16515.
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cp-muted">
              Wiki
            </h4>
            <ul className="space-y-2">
              {wikiLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cp-muted">
              Legal
            </h4>
            <ul className="space-y-2">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cp-muted">
              Connect
            </h4>
            <div className="flex gap-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cp-border bg-cp-elevated text-cp-muted transition hover:border-cp-border-subtle hover:text-foreground"
                aria-label="Instagram"
              >
                <Share2 className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cp-border bg-cp-elevated text-cp-muted transition hover:border-cp-border-subtle hover:text-foreground"
                aria-label="Twitter"
              >
                <UserRound className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-cp-border pt-6 text-center text-xs text-cp-text-dim lg:text-left">
          © {new Date().getFullYear()} {siteConfig.name}. Performance Data Aesthetics.
        </p>
      </div>
    </footer>
  );
}
