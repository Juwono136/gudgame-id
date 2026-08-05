import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { ContactPageContent } from "@/components/sections/contact-page-content";
import { pageMeta } from "@/lib/constants/pages";
import { getHomepageSettings } from "@/lib/site/homepage-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getHomepageSettings();
  return {
    title: settings.contact.title || pageMeta.contact.title,
    description: settings.contact.subtitle || pageMeta.contact.description,
  };
}

export default async function ContactPage() {
  const settings = await getHomepageSettings();

  return (
    <PageShell>
      <ContactPageContent content={settings.contact} />
    </PageShell>
  );
}
