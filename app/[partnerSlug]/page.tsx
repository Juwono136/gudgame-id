import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerTournamentRow } from "@/components/partners/partner-tournament-row";
import { Button } from "@/components/ui/button";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import {
  countPartnerTournaments,
  listPartnerTournamentTeasers,
} from "@/lib/partners/tournaments";
import { countPartnerLeagues } from "@/lib/partners/leagues";
import { partnerPublicRoutes } from "@/lib/constants/routes";

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
    `Premium events by ${partner.displayName} — your club hub, separate from Gud Game rankings.`;
  const about = partner.branding.about?.trim();
  const { contactEmail, contactWhatsapp, contactWebsite } = partner.branding;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-cp-border/80 bg-cp-card/70 shadow-lg shadow-black/5 dark:shadow-black/30">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(125deg, ${primary}22 0%, transparent 42%, ${primary}10 100%)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: primary }}
          aria-hidden
        />

        <div className="relative grid gap-8 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {partner.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partner.logoUrl}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover shadow-lg ring-2 ring-white/50 dark:ring-white/10 sm:h-20 sm:w-20"
                />
              ) : (
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg sm:h-20 sm:w-20 sm:text-3xl"
                  style={{ background: primary }}
                >
                  {partner.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cp-muted">
                  Partner club
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {heroTitle}
                </h1>
              </div>
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-cp-muted sm:text-base">
              {tagline}
            </p>
            {about ? (
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {about}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="bg-cp-primary hover:bg-cp-primary-light">
                <Link href={partnerPublicRoutes.tournaments(partner.slug)}>
                  Browse tournaments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-cp-border bg-cp-card/60">
                <Link href={partnerPublicRoutes.leagues(partner.slug)}>View leagues</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href={partnerPublicRoutes.players(partner.slug)}>Player history</Link>
              </Button>
            </div>

            {(contactEmail || contactWhatsapp || contactWebsite) && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-cp-border/60 pt-4 text-xs text-cp-muted sm:text-sm">
                {contactEmail ? (
                  <li>
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

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                icon: CalendarDays,
                label: "Events",
                value: String(tournamentTotal),
              },
              {
                icon: Trophy,
                label: "Live / upcoming",
                value: String(liveCount),
              },
              {
                icon: Users,
                label: "Leagues",
                value: String(leagueTotal),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-cp-border/70 bg-background/50 px-3 py-4 text-center backdrop-blur-sm sm:px-4"
              >
                <stat.icon className="mx-auto h-4 w-4 text-cp-primary" />
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-cp-muted sm:text-[11px]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12 sm:mt-14">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">
              Upcoming & live
            </h2>
            <p className="mt-1 text-xs text-cp-muted sm:text-sm">
              Events on this site stay off Gud Game career rankings.
            </p>
          </div>
          <Link
            href={partnerPublicRoutes.tournaments(partner.slug)}
            className="text-xs font-medium text-cp-primary hover:underline sm:text-sm"
          >
            View all
          </Link>
        </div>
        {live.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-dashed border-cp-border bg-cp-card/40">
            <PartnerEmptyState
              title="No upcoming events yet"
              description="Check back soon — new tournaments will show up here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-cp-border overflow-hidden rounded-2xl border border-cp-border bg-cp-card/80 shadow-sm backdrop-blur-sm">
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
