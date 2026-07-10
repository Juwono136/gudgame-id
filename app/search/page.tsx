import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { GlobalSearchPageClient } from "@/components/search/global-search-page-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const metadata = {
  title: "Search",
  description: "Search players, gear, and tournaments on Gud Game.",
};

type PageProps = {
  searchParams: Promise<{ q?: string; sport?: string }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading search…" />
          </div>
        }
      >
        <GlobalSearchPageClient initialQuery={params.q ?? ""} sportSlug={params.sport} />
      </Suspense>
    </PageShell>
  );
}
