import { Suspense } from "react";
import Footer from "@/components/layout/footer";
import {
  DEFAULT_HOMEPAGE_SETTINGS,
  getHomepageSettings,
} from "@/lib/site/homepage-settings";

async function SiteFooterContent() {
  const settings = await getHomepageSettings();
  return <Footer content={settings.footer} />;
}

/** Server footer with CMS content; falls back to defaults while loading. */
export function SiteFooter() {
  return (
    <Suspense fallback={<Footer content={DEFAULT_HOMEPAGE_SETTINGS.footer} />}>
      <SiteFooterContent />
    </Suspense>
  );
}
