import { PageShell } from "@/components/layout/page-shell";
import Hero from "@/components/sections/hero";
import SportsDirectory from "@/components/sections/sports-directory";
import CTACommunity from "@/components/sections/cta-community";
import { getHomepageSettings } from "@/lib/site/homepage-settings";
import { listPublicSports } from "@/lib/sports/service";

export default async function Home() {
  const [sports, homepage] = await Promise.all([
    listPublicSports(),
    getHomepageSettings(),
  ]);

  return (
    <PageShell>
      <Hero content={homepage.hero} />
      <SportsDirectory sports={sports} content={homepage.sportsSection} />
      <CTACommunity />
    </PageShell>
  );
}
