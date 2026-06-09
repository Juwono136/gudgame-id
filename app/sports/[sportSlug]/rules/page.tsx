import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { FadeInView } from "@/components/motion/fade-in";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { getSportBySlug } from "@/lib/wiki/public";
import { publicSportRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ sportSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  return { title: sport ? `${sport.name} Rules` : "Rules" };
}

export default async function SportRulesPage({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <FadeInView>
          <Link
            href={publicSportRoutes.sportHub(sportSlug)}
            className="text-sm text-cp-muted hover:text-foreground"
          >
            ← Back to {sport.name}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-foreground">Rules & how to play</h1>
        </FadeInView>

        <div className="mt-8 space-y-8">
          {sport.rulesSummary ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="font-semibold text-foreground">Summary</h2>
              <RichHtmlContent
                html={sport.rulesSummary}
                variant="article"
                className="mt-3"
              />
            </section>
          ) : null}
          {sport.howToPlay ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="font-semibold text-foreground">How to play</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-cp-muted">
                {sport.howToPlay}
              </p>
            </section>
          ) : null}
          {sport.equipmentOverview ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="font-semibold text-foreground">Equipment overview</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-cp-muted">
                {sport.equipmentOverview}
              </p>
            </section>
          ) : null}
          {!sport.rulesSummary && !sport.howToPlay && !sport.equipmentOverview ? (
            <p className="rounded-xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
              Rules content for {sport.name} has not been published yet.
            </p>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
