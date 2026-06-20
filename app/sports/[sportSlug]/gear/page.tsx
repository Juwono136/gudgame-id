import { notFound } from "next/navigation";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { GearCatalog } from "@/components/wiki/gear-catalog";
import { getSportBySlug } from "@/lib/wiki/public";
import { publicSportRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ sportSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  return { title: sport ? `${sport.name} Gear & Tools` : "Gear & Tools" };
}

export default async function GearListPage({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  return (
    <WikiPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: sport.name, href: publicSportRoutes.sportHub(sportSlug) },
        { label: "Gear & Tools" },
      ]}
    >
      <GearCatalog sportSlug={sportSlug} sportName={sport.name} />
    </WikiPageShell>
  );
}
