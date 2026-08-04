import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerBrandCssVars } from "@/lib/partners/brand-style";
import { cn } from "@/lib/utils";

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
            : "space-y-6 px-4 py-7 sm:space-y-8 sm:px-10 sm:py-11",
        )}
      >
        <div className={cn(compact ? "space-y-3.5" : "space-y-5")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {logoUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl.trim()}
                alt=""
                className={cn(
                  "shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-black/5 dark:ring-white/10",
                  compact
                    ? "h-14 w-14"
                    : "h-16 w-16 sm:h-[4.75rem] sm:w-[4.75rem]",
                )}
              />
            ) : (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-md",
                  compact
                    ? "h-14 w-14 text-xl"
                    : "h-16 w-16 text-2xl sm:h-[4.75rem] sm:w-[4.75rem] sm:text-3xl",
                )}
                style={{ background: primary }}
              >
                {(displayName || "P").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
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
                  compact ? "text-xs" : "text-sm sm:text-base",
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
                "max-w-3xl text-foreground/90",
                compact && "max-h-36 overflow-hidden text-xs",
              )}
            />
          ) : null}

          <div
            className={cn(
              compact ? "flex flex-wrap gap-2" : "grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap",
            )}
          >
            {ctaTournaments}
            {ctaLeagues}
          </div>

          {hasContact ? (
            <ul
              className={cn(
                "flex flex-wrap gap-x-4 gap-y-1 border-t border-cp-border/60 text-cp-muted",
                compact ? "pt-3 text-[11px]" : "pt-4 text-xs sm:text-sm",
              )}
            >
              {contactEmail?.trim() ? (
                <li className="min-w-0 break-all">
                  {interactive ? (
                    <a
                      href={`mailto:${contactEmail.trim()}`}
                      className="font-medium text-cp-primary hover:underline"
                    >
                      {contactEmail.trim()}
                    </a>
                  ) : (
                    <span className="font-medium text-cp-primary">{contactEmail.trim()}</span>
                  )}
                </li>
              ) : null}
              {contactWhatsapp?.trim() ? (
                <li>
                  <span className="font-medium text-foreground">{contactWhatsapp.trim()}</span>
                </li>
              ) : null}
              {contactWebsite?.trim() ? (
                <li>
                  {interactive ? (
                    <a
                      href={contactWebsite.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-cp-primary hover:underline"
                    >
                      Website
                    </a>
                  ) : (
                    <span className="font-medium text-cp-primary">Website</span>
                  )}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {stats && stats.length > 0 ? (
          <div
            className={cn(
              "grid grid-cols-3 border-t border-cp-border/60",
              compact ? "gap-1 pt-4" : "gap-1.5 pt-5 sm:gap-3 sm:pt-6",
            )}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "min-w-0 border border-cp-border/70 bg-background/65 text-center backdrop-blur-sm",
                  compact
                    ? "rounded-xl px-1 py-2.5"
                    : "rounded-xl px-1.5 py-3 sm:rounded-2xl sm:px-4 sm:py-5",
                )}
              >
                <stat.icon
                  className={cn("mx-auto", compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-5 sm:w-5")}
                  style={{ color: primary }}
                  aria-hidden
                />
                <p
                  className={cn(
                    "mt-1.5 font-bold tabular-nums tracking-tight text-foreground",
                    compact ? "text-base" : "text-xl sm:mt-2 sm:text-3xl",
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-semibold uppercase leading-tight text-cp-muted",
                    compact
                      ? "text-[8px] tracking-[0.06em]"
                      : "text-[9px] tracking-[0.08em] sm:mt-1 sm:text-[11px] sm:tracking-[0.1em]",
                  )}
                >
                  <span className={compact ? undefined : "sm:hidden"}>{stat.shortLabel}</span>
                  {!compact ? (
                    <span className="hidden sm:inline">{stat.label}</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
