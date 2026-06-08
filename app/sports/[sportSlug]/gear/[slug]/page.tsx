import { notFound } from "next/navigation";
import { EntityDetailLayout } from "@/components/wiki/entity-detail-layout";
import { getSportBySlug } from "@/lib/wiki/public";
import { getPublishedWikiEntityBySlug } from "@/lib/wiki/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const entity = await getPublishedWikiEntityBySlug(sportSlug, "gear", slug);
  return { title: entity?.displayName ?? "Gear" };
}

export default async function GearWikiPage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport) notFound();

  const entity = await getPublishedWikiEntityBySlug(sportSlug, "gear", slug);
  if (!entity) notFound();

  return <EntityDetailLayout entity={entity} sportName={sport.name} />;
}
