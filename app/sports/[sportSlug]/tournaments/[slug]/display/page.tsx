import { TournamentDisplayClient } from "@/components/tournaments/tournament-display-client";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export const metadata = {
  title: "Live Display",
};

export default async function TournamentDisplayPage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  return <TournamentDisplayClient sportSlug={sportSlug} slug={slug} />;
}
