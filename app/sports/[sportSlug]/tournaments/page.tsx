import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentCard } from "@/components/sports/tournament-card";
import { FadeInView } from "@/components/motion/fade-in";
import { getSportBySlug } from "@/lib/wiki/public";
import { listPublicTournamentsBySport } from "@/lib/tournaments/service";
import { publicSportRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ sportSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  return { title: sport ? `${sport.name} Tournaments` : "Tournaments" };
}

export default async function SportTournamentsPage({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const [live, upcoming, past] = await Promise.all([
    listPublicTournamentsBySport(sportSlug, "live", 24),
    listPublicTournamentsBySport(sportSlug, "upcoming", 24),
    listPublicTournamentsBySport(sportSlug, "past", 24),
  ]);

  const sections = [
    { title: "Live", items: live },
    { title: "Upcoming", items: upcoming },
    { title: "Past", items: past },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <FadeInView>
          <Link
            href={publicSportRoutes.sportHub(sportSlug)}
            className="text-sm text-cp-muted hover:text-foreground"
          >
            ← Back to {sport.name}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-foreground">Tournaments</h1>
          <p className="mt-2 text-cp-muted">
            Official, recreational, and sparring events for {sport.name}.
          </p>
        </FadeInView>

        <div className="mt-10 space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-lg font-semibold text-foreground">{section.title}</h2>
              {section.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-cp-border py-10 text-center text-sm text-cp-muted">
                  No {section.title.toLowerCase()} tournaments.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((t) => (
                    <TournamentCard key={t.id} tournament={t} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
