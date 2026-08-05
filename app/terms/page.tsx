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
    title: settings.terms.title || pageMeta.terms.title,
    description: settings.terms.subtitle || pageMeta.terms.description,
  };
}

export default async function TermsPage() {
  const settings = await getHomepageSettings();

  return (
    <PageShell>
      <LegalDocumentPageContent
        content={settings.terms}
        relatedHref="/privacy"
        relatedLabel="Privacy Policy"
      />
    </PageShell>
  );
}
