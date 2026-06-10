import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PublicTournamentsDirectory } from "@/components/sports/public-tournaments-directory";
import { getSportBySlug } from "@/lib/wiki/public";

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

  return (
    <PageShell>
      <PublicTournamentsDirectory sportSlug={sportSlug} sportName={sport.name} />
    </PageShell>
  );
}
