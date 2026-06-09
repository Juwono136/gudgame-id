import { PageShell } from "@/components/layout/page-shell";
import Hero from "@/components/sections/hero";
import SportsDirectory from "@/components/sections/sports-directory";
import CTACommunity from "@/components/sections/cta-community";
import { listPublicSports } from "@/lib/sports/service";

export default async function Home() {
  const sports = await listPublicSports();

  return (
    <PageShell>
      <Hero />
      <SportsDirectory sports={sports} />
      <CTACommunity />
    </PageShell>
  );
}
