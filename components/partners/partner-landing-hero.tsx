import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Globe,
  Mail,
  Phone,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerBrandCssVars } from "@/lib/partners/brand-style";
import { cn } from "@/lib/utils";

function whatsappHref(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : `https://wa.me/`;
}

function ContactChip({
  href,
  interactive,
  icon: Icon,
  children,
  compact,
}: {
  href?: string;
  interactive: boolean;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const className = cn(
    "inline-flex max-w-full items-center gap-2 rounded-full border border-cp-border/80 bg-background/70 font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors",
    "hover:border-cp-primary/40 hover:bg-cp-primary/5 hover:text-cp-primary",
    compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm",
  );

  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-cp-primary/12 text-cp-primary",
          compact ? "h-5 w-5" : "h-6 w-6 sm:h-7 sm:w-7",
        )}
      >
        <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </>
  );

  if (interactive && href) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        className={className}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }

  return <span className={className}>{content}</span>;
}

export type PartnerLandingHeroStat = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean }>;
  label: string;
  shortLabel: string;
  value: number;
};

export type PartnerLandingHeroProps = {
  displayName: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor?: string;
  heroTitle?: string | null;
  tagline?: string | null;
  about?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactWebsite?: string | null;
  /** When set, CTAs are real links. Preview mode uses non-navigating buttons. */
  interactive?: boolean;
  stats?: PartnerLandingHeroStat[];
  /** Compact sticky sidebar preview (same structure, tighter spacing). */
  compact?: boolean;
  className?: string;
};

/**
 * Public partner landing hero — shared by the live site and branding live preview
 * so dashboard edits match what visitors see.
 */
export function PartnerLandingHero({
  displayName,
  slug,
  logoUrl,
  primaryColor,
  accentColor,
  heroTitle,
  tagline,
  about,
  contactEmail,
  contactWhatsapp,
  contactWebsite,
  interactive = true,
  stats,
  compact = false,
  className,
}: PartnerLandingHeroProps) {
  const primary = primaryColor.trim() || "#0d9488";
  const accent = (accentColor?.trim() || primary);
  const title = heroTitle?.trim() || displayName;
  const subtitle =
    tagline?.trim() || `Events and standings from ${displayName || "your club"}.`;
  const aboutHtml = about?.trim() || "";
  const tournamentsHref = partnerPublicRoutes.tournaments(slug);
  const leaguesHref = partnerPublicRoutes.leagues(slug);
  const hasContact = Boolean(
    contactEmail?.trim() || contactWhatsapp?.trim() || contactWebsite?.trim(),
  );

  const ctaTournaments = interactive ? (
    <Button
      asChild
      size="lg"
      className={cn(
        "justify-center border-transparent text-white hover:opacity-90",
        compact ? "h-9 w-auto text-xs" : "h-11 w-full sm:h-10 sm:w-auto",
      )}
      style={{ backgroundColor: primary }}
    >
      <Link href={tournamentsHref}>
        <CalendarDays className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        Tournaments
        <ArrowRight className="ml-2 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      </Link>
    </Button>
  ) : (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 font-semibold text-white",
        compact ? "h-9 text-xs" : "h-10 text-sm",
      )}
      style={{ backgroundColor: primary }}
    >
      <CalendarDays className="mr-2 h-4 w-4 shrink-0" aria-hidden />
      Tournaments
      <ArrowRight className="ml-2 h-4 w-4 shrink-0 opacity-80" aria-hidden />
    </span>
  );

  const ctaLeagues = interactive ? (
    <Button
      asChild
      size="lg"
      variant="outline"
      className={cn(
        "justify-center bg-background/70",
        compact ? "h-9 w-auto text-xs" : "h-11 w-full sm:h-10 sm:w-auto",
      )}
      style={{ borderColor: accent, color: accent }}
    >
      <Link href={leaguesHref}>
        <Trophy className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        Leagues
      </Link>
    </Button>
  ) : (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border bg-background/70 px-4 font-semibold",
        compact ? "h-9 text-xs" : "h-10 text-sm",
      )}
      style={{ borderColor: accent, color: accent }}
    >
      <Trophy className="mr-2 h-4 w-4 shrink-0" aria-hidden />
      Leagues
    </span>
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cp-border/80 bg-cp-card/90 shadow-sm sm:rounded-[1.75rem]",
        className,
      )}
      style={partnerBrandCssVars(primary, accent)}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(145deg, ${primary}28 0%, transparent 50%, ${accent}14 100%)`,
        }}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute -right-10 top-0 rounded-full opacity-30 blur-3xl",
          compact ? "h-36 w-36" : "h-48 w-48 sm:h-64 sm:w-64",
        )}
        style={{ background: primary }}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute -left-8 bottom-0 rounded-full opacity-20 blur-3xl",
          compact ? "h-24 w-24" : "h-36 w-36 sm:h-48 sm:w-48",
        )}
        style={{ background: accent }}
        aria-hidden
      />

      <div
        className={cn(
          "relative",
          compact
            ? "space-y-4 px-4 py-5"
            : "space-y-7 px-4 py-7 sm:space-y-8 sm:px-8 sm:py-10 lg:px-10 lg:py-11",
        )}
      >
        <div
          className={cn(
            "flex flex-col",
            compact ? "gap-4" : "gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10",
          )}
        >
          <div className={cn("min-w-0 flex-1", compact ? "space-y-3.5" : "space-y-5")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              {logoUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl.trim()}
                  alt=""
                  className={cn(
                    "shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-black/5 dark:ring-white/10",
                    compact
                      ? "h-14 w-14"
                      : "mx-auto h-16 w-16 sm:mx-0 sm:h-[4.75rem] sm:w-[4.75rem]",
                  )}
                />
              ) : (
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-md",
                    compact
                      ? "h-14 w-14 text-xl"
                      : "mx-auto h-16 w-16 text-2xl sm:mx-0 sm:h-[4.75rem] sm:w-[4.75rem] sm:text-3xl",
                  )}
                  style={{ background: primary }}
                >
                  {(displayName || "P").slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className={cn("min-w-0", !compact && "text-center sm:text-left")}>
                <h1
                  className={cn(
                    "break-words font-bold tracking-tight text-foreground",
                    compact ? "text-xl" : "text-3xl sm:text-4xl",
                  )}
                >
                  {title}
                </h1>
                <p
                  className={cn(
                    "mt-2 max-w-2xl leading-relaxed text-cp-muted",
                    compact ? "text-xs" : "mx-auto text-sm sm:mx-0 sm:text-base",
                  )}
                >
                  {subtitle}
                </p>
              </div>
            </div>

            {aboutHtml ? (
              <RichHtmlContent
                html={aboutHtml}
                variant="article"
                className={cn(
                  "max-w-3xl text-foreground/90 [&_.rich-html]:text-cp-muted",
                  compact && "max-h-36 overflow-hidden text-xs",
                  !compact && "text-center sm:text-left",
                )}
              />
            ) : null}

            <div
              className={cn(
                compact
                  ? "flex flex-wrap gap-2"
                  : "grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:justify-start",
              )}
            >
              {ctaTournaments}
              {ctaLeagues}
            </div>

            {hasContact ? (
              <div
                className={cn(
                  "border-t border-cp-border/60",
                  compact ? "pt-3" : "pt-4 sm:pt-5",
                )}
              >
                <p
                  className={cn(
                    "mb-2 font-semibold uppercase tracking-[0.12em] text-cp-muted",
                    compact ? "text-[9px]" : "text-[10px] sm:text-[11px]",
                  )}
                >
                  Contact
                </p>
                <ul
                  className={cn(
                    "flex flex-wrap gap-2",
                    !compact && "justify-center sm:justify-start",
                  )}
                >
                  {contactEmail?.trim() ? (
                    <li className="min-w-0 max-w-full">
                      <ContactChip
                        href={`mailto:${contactEmail.trim()}`}
                        interactive={interactive}
                        icon={Mail}
                        compact={compact}
                      >
                        {contactEmail.trim()}
                      </ContactChip>
                    </li>
                  ) : null}
                  {contactWhatsapp?.trim() ? (
                    <li className="min-w-0 max-w-full">
                      <ContactChip
                        href={whatsappHref(contactWhatsapp.trim())}
                        interactive={interactive}
                        icon={Phone}
                        compact={compact}
                      >
                        {contactWhatsapp.trim()}
                      </ContactChip>
                    </li>
                  ) : null}
                  {contactWebsite?.trim() ? (
                    <li className="min-w-0 max-w-full">
                      <ContactChip
                        href={contactWebsite.trim()}
                        interactive={interactive}
                        icon={Globe}
                        compact={compact}
                      >
                        Website
                      </ContactChip>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>

          {stats && stats.length > 0 && !compact ? (
            <div className="grid w-full shrink-0 grid-cols-3 gap-2 sm:gap-3 lg:w-[17.5rem] lg:grid-cols-1 lg:gap-2.5 xl:w-[19rem]">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-0 rounded-2xl border border-cp-border/70 bg-background/70 px-2 py-3 text-center shadow-sm backdrop-blur-sm sm:px-4 sm:py-4 lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3.5 lg:text-left"
                >
                  <span
                    className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-cp-primary/10 sm:h-10 sm:w-10 lg:mx-0 lg:shrink-0"
                    style={{ color: primary }}
                  >
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 lg:flex-1">
                    <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-2xl lg:mt-0 lg:text-2xl">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-cp-muted sm:text-[11px] sm:tracking-[0.1em]">
                      <span className="sm:hidden">{stat.shortLabel}</span>
                      <span className="hidden sm:inline">{stat.label}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {stats && stats.length > 0 && compact ? (
          <div className="grid grid-cols-3 gap-1 border-t border-cp-border/60 pt-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-xl border border-cp-border/70 bg-background/65 px-1 py-2.5 text-center backdrop-blur-sm"
              >
                <stat.icon
                  className="mx-auto h-3.5 w-3.5"
                  style={{ color: primary }}
                  aria-hidden
                />
                <p className="mt-1.5 text-base font-bold tabular-nums tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-cp-muted">
                  {stat.shortLabel}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
