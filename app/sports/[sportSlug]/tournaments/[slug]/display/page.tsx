import { notFound } from "next/navigation";
import { TournamentDisplayClient } from "@/components/tournaments/tournament-display-client";
import { getTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export const metadata = {
  title: "Live Display",
};

export default async function TournamentDisplayPage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const tournament = await getTournamentBySlug(sportSlug, slug);
  // Partner white-label events use /{partnerSlug}/…/display — not Gud Game sport chrome.
  if (!tournament || tournament.partnerId) notFound();

  return <TournamentDisplayClient sportSlug={sportSlug} slug={slug} />;
}
