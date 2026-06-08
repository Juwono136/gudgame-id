import { PageShell } from "@/components/layout/page-shell";
import Hero from "@/components/sections/hero";
import SportsDirectory from "@/components/sections/sports-directory";
import CTACommunity from "@/components/sections/cta-community";

export default function Home() {
  return (
    <PageShell>
      <Hero />
      <SportsDirectory />
      <CTACommunity />
    </PageShell>
  );
}
