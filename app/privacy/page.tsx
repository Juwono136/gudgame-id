import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { LegalDocumentPageContent } from "@/components/sections/legal-document-page-content";
import { pageMeta } from "@/lib/constants/pages";
import { getHomepageSettings } from "@/lib/site/homepage-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getHomepageSettings();
  return {
    title: settings.privacy.title || pageMeta.privacy.title,
    description: settings.privacy.subtitle || pageMeta.privacy.description,
  };
}

export default async function PrivacyPage() {
  const settings = await getHomepageSettings();

  return (
    <PageShell>
      <LegalDocumentPageContent
        content={settings.privacy}
        relatedHref="/terms"
        relatedLabel="Terms of Service"
      />
    </PageShell>
  );
}
