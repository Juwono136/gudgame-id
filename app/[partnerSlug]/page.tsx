import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerTournamentRow } from "@/components/partners/partner-tournament-row";
import { Button } from "@/components/ui/button";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { countPartnerLeagues } from "@/lib/partners/leagues";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import {
  countPartnerTournaments,
  listPartnerTournamentTeasers,
} from "@/lib/partners/tournaments";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerLandingPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const [live, tournamentTotal, leagueTotal, liveCount] = await Promise.all([
    listPartnerTournamentTeasers(partner.id, { limit: 6, status: "active" }),
    countPartnerTournaments(partner.id, "all", { excludeDrafts: true }),
    countPartnerLeagues(partner.id, "public"),
    countPartnerTournaments(partner.id, "active"),
  ]);
  const primary = partner.branding.primaryColor ?? "#0d9488";
  const heroTitle = partner.branding.heroTitle?.trim() || partner.displayName;
  const tagline =
    partner.branding.tagline?.trim() ||
    `Events and standings from ${partner.displayName}.`;
  const about = partner.branding.about?.trim();
  const { contactEmail, contactWhatsapp, contactWebsite } = partner.branding;

  const stats = [
    { icon: CalendarDays, label: "Tournaments", shortLabel: "Events", value: tournamentTotal },
    { icon: Trophy, label: "Live / upcoming", shortLabel: "Active", value: liveCount },
    { icon: Users, label: "Leagues", shortLabel: "Leagues", value: leagueTotal },
  ];

  const ctaClass =
    "h-11 w-full justify-center sm:h-10 sm:w-auto sm:justify-start";

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-cp-border/80 bg-cp-card/85 shadow-sm sm:rounded-[1.75rem]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${primary}22 0%, transparent 52%, ${primary}0a 100%)`,
          }}
          aria-hidden
        />

        <div className="relative space-y-6 px-4 py-7 sm:space-y-8 sm:px-10 sm:py-11">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {partner.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partner.logoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-black/5 dark:ring-white/10 sm:h-[4.5rem] sm:w-[4.5rem]"
                />
              ) : (
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-md sm:h-[4.5rem] sm:w-[4.5rem] sm:text-3xl"
                  style={{ background: primary }}
                >
                  {partner.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {heroTitle}
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-cp-muted sm:text-base">
                  {tagline}
                </p>
              </div>
            </div>

            {about ? (
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {about}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap">
              <Button asChild size="lg" className={`bg-cp-primary hover:bg-cp-primary-light ${ctaClass}`}>
                <Link href={partnerPublicRoutes.tournaments(partner.slug)}>
                  <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                  Tournaments
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0 opacity-80" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className={`border-cp-border bg-background/70 ${ctaClass}`}
              >
                <Link href={partnerPublicRoutes.leagues(partner.slug)}>
                  <Trophy className="mr-2 h-4 w-4 shrink-0" />
                  Leagues
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className={`text-cp-muted hover:text-foreground ${ctaClass}`}
              >
                <Link href={partnerPublicRoutes.players(partner.slug)}>
                  <Users className="mr-2 h-4 w-4 shrink-0" />
                  Players
                </Link>
              </Button>
            </div>

            {(contactEmail || contactWhatsapp || contactWebsite) && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-cp-border/60 pt-4 text-xs text-cp-muted sm:text-sm">
                {contactEmail ? (
                  <li className="min-w-0 break-all">
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-medium text-cp-primary hover:underline"
                    >
                      {contactEmail}
                    </a>
                  </li>
                ) : null}
                {contactWhatsapp ? (
                  <li>
                    <span className="font-medium text-foreground">{contactWhatsapp}</span>
                  </li>
                ) : null}
                {contactWebsite ? (
                  <li>
                    <a
                      href={contactWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-cp-primary hover:underline"
                    >
                      Website
                    </a>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 border-t border-cp-border/60 pt-5 sm:gap-3 sm:pt-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-xl border border-cp-border/70 bg-background/60 px-1.5 py-3 text-center backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-5"
              >
                <stat.icon
                  className="mx-auto h-3.5 w-3.5 sm:h-5 sm:w-5"
                  style={{ color: primary }}
                  aria-hidden
                />
                <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-cp-muted sm:mt-1 sm:text-[11px] sm:tracking-[0.1em]">
                  <span className="sm:hidden">{stat.shortLabel}</span>
                  <span className="hidden sm:inline">{stat.label}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 min-w-0 sm:mt-12">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">Schedule</h2>
            <p className="mt-1 text-xs text-cp-muted sm:text-sm">Live and upcoming tournaments</p>
          </div>
          <Link
            href={partnerPublicRoutes.tournaments(partner.slug)}
            className="shrink-0 text-xs font-medium text-cp-primary hover:underline sm:text-sm"
          >
            View all
          </Link>
        </div>
        {live.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-dashed border-cp-border bg-cp-card/50">
            <PartnerEmptyState
              title="No events yet"
              description="Published tournaments will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-cp-border overflow-hidden rounded-2xl border border-cp-border bg-cp-card/90 shadow-sm">
            {live.map((t) => (
              <PartnerTournamentRow
                key={t.id}
                tournament={t}
                href={partnerPublicRoutes.tournament(partner.slug, t.slug)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
