"use client";

import { useState } from "react";
import { GlobalSearchBox } from "@/components/search/global-search-box";
import { GlobalSearchResults } from "@/components/search/global-search-results";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { useDebounce } from "@/hooks/use-debounce";

type GlobalSearchPageClientProps = {
  initialQuery?: string;
  sportSlug?: string;
};

export function GlobalSearchPageClient({
  initialQuery = "",
  sportSlug,
}: GlobalSearchPageClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 350);

  const { data, isLoading, isError, isFetching } = useGlobalSearch({
    query: debouncedQuery,
    sportSlug,
    limit: 20,
    enabled: debouncedQuery.trim().length >= 2,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">
          Wiki search
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Find players, gear & tournaments
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-cp-muted">
          Search published profiles, equipment, events, and news across live sports on
          Gud Game.
        </p>
      </div>

      <div className="mt-8">
        <GlobalSearchBox
          variant="page"
          sportSlug={sportSlug}
          query={query}
          onQueryChange={setQuery}
          showInlineResults={false}
          autoFocus
          className="rounded-2xl border border-cp-border bg-cp-card p-3 sm:p-4"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-cp-border bg-cp-card p-3 sm:p-4">
        <GlobalSearchResults
          results={data?.results ?? []}
          query={debouncedQuery}
          isLoading={isLoading || isFetching}
          isError={isError}
        />
      </div>
    </div>
  );
}
