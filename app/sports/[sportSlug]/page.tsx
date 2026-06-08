import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { getSportBySlug } from "@/lib/wiki/public";
import { publicSportRoutes } from "@/lib/constants/routes";
import { Users, User, Package } from "lucide-react";

type PageProps = {
  params: Promise<{ sportSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  return { title: sport ? `${sport.name} Wiki` : "Sport" };
}

export default async function SportHubPage({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport) notFound();

  const sections = [
    {
      href: publicSportRoutes.players(sportSlug),
      label: "Players",
      desc: "Pro profiles, stats & career data",
      icon: User,
    },
    {
      href: publicSportRoutes.teams(sportSlug),
      label: "Teams",
      desc: "Duos, squads & chemistry metrics",
      icon: Users,
    },
    {
      href: publicSportRoutes.gear(sportSlug),
      label: "Gear & tools",
      desc: "Rackets, shoes & equipment specs",
      icon: Package,
    },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-cp-primary">
          TandingBase Wiki
        </p>
        <h1 className="mt-2 text-4xl font-bold text-foreground">{sport.name}</h1>
        <p className="mt-4 text-cp-muted">
          Browse players, teams, and gear for {sport.name}. Data is curated by our
          admin team and hosts.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-cp-border bg-cp-card p-6 transition-colors hover:border-cp-primary/50"
            >
              <s.icon className="mb-3 h-8 w-8 text-cp-primary" />
              <h2 className="font-semibold text-foreground">{s.label}</h2>
              <p className="mt-1 text-xs text-cp-muted">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
