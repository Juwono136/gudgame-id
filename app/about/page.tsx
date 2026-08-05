import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { AboutPageContent } from "@/components/sections/about-page-content";
import { pageMeta } from "@/lib/constants/pages";
import { getHomepageSettings } from "@/lib/site/homepage-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getHomepageSettings();
  return {
    title: settings.about.title || pageMeta.about.title,
    description: settings.about.subtitle || pageMeta.about.description,
  };
}

export default async function AboutPage() {
  const settings = await getHomepageSettings();

  return (
    <PageShell>
      <AboutPageContent content={settings.about} />
    </PageShell>
  );
}
