import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Package,
  ShieldAlert,
  Trophy,
  User,
} from "lucide-react";
import { TournamentCard } from "@/components/sports/tournament-card";
import { FadeInView } from "@/components/motion/fade-in";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { SportDetail } from "@/lib/sports/service";
import { resolveUserImageUrl } from "@/lib/storage/media-url";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

type SportHubContentProps = {
  sport: SportDetail;
  live: TournamentListItem[];
  upcoming: TournamentListItem[];
  past: TournamentListItem[];
};

export function SportHubContent({ sport, live, upcoming, past }: SportHubContentProps) {
  const modules = sport.modules;
  const quickLinks = [
    modules.tournaments && {
      id: "tournaments",
      href: publicSportRoutes.tournaments(sport.slug),
      label: "Tournaments",
      icon: Trophy,
      desc: "Live, upcoming & past events",
    },
    modules.players && {
      id: "players",
      href: publicSportRoutes.players(sport.slug),
      label: modules.rankings ? "Players & rankings" : "Players",
      icon: modules.rankings ? Award : User,
      desc: modules.rankings
        ? "Profiles, leaderboards & standings"
        : "Profiles & career data",
    },
    !modules.players &&
      modules.rankings && {
        id: "rankings",
        href: publicSportRoutes.players(sport.slug),
        label: "Rankings",
        icon: Award,
        desc: "Leaderboards & standings",
      },
    modules.gear && {
      id: "gear",
      href: publicSportRoutes.gear(sport.slug),
      label: "Equipment",
      icon: Package,
      desc: "Gear specs & reviews",
    },
    modules.rules && {
      id: "rules",
      href: publicSportRoutes.rules(sport.slug),
      label: "Rules",
      icon: ShieldAlert,
      desc: "How to play & regulations",
    },
  ].filter(Boolean) as {
    id: string;
    href: string;
    label: string;
    icon: typeof Trophy;
    desc: string;
  }[];

  const heroUrl = resolveUserImageUrl(sport.heroImageUrl);

  return (
    <div>
      <div className="relative min-h-[280px] overflow-hidden border-b border-cp-border bg-cp-card">
        {heroUrl ? (
          <>
            <Image src={heroUrl} alt="" fill className="object-cover" priority unoptimized />
            <div className="absolute inset-0 bg-gradient-to-r from-cp-bg/95 via-cp-bg/80 to-cp-bg/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,71,255,0.12),transparent)]" />
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <FadeInView>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cp-primary">
              TandingBase
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {sport.name}
            </h1>
            {sport.tagline ? (
              <p className="mt-3 max-w-2xl text-lg text-cp-muted">{sport.tagline}</p>
            ) : null}
            {sport.description ? (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-cp-muted sm:text-base">
                {sport.description}
              </p>
            ) : null}
          </FadeInView>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

      {quickLinks.length > 0 ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link, i) => (
            <FadeInView key={link.id} delay={i * 0.05}>
              <Link
                href={link.href}
                className={cn(
                  "block rounded-xl border border-cp-border bg-cp-card p-5 transition-all duration-300",
                  "hover:border-cp-primary/40 hover:bg-cp-card/90",
                )}
              >
                <link.icon className="mb-3 h-7 w-7 text-cp-primary" />
                <h2 className="font-semibold text-foreground">{link.label}</h2>
                <p className="mt-1 text-xs text-cp-muted">{link.desc}</p>
              </Link>
            </FadeInView>
          ))}
        </div>
      ) : null}

      <section className="mt-14 space-y-10">
        <TournamentSection
          title="Live tournaments"
          tournaments={live}
          sportSlug={sport.slug}
          emptyMessage="No live tournaments right now."
        />
        <TournamentSection
          title="Upcoming tournaments"
          tournaments={upcoming}
          sportSlug={sport.slug}
          emptyMessage="No upcoming tournaments yet. Check back soon."
        />
        <TournamentSection
          title="Past tournaments"
          tournaments={past}
          sportSlug={sport.slug}
          emptyMessage="No completed tournaments yet."
        />
      </section>
      </div>
    </div>
  );
}

function TournamentSection({
  title,
  tournaments,
  sportSlug,
  emptyMessage,
}: {
  title: string;
  tournaments: TournamentListItem[];
  sportSlug: string;
  emptyMessage?: string;
}) {
  return (
    <FadeInView>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <Link
          href={publicSportRoutes.tournaments(sportSlug)}
          className="text-sm font-medium text-cp-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {tournaments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-cp-border py-10 text-center text-sm text-cp-muted">
          {emptyMessage ?? "Nothing here yet."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </FadeInView>
  );
}
