"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { GlobalSearchResults } from "@/components/search/global-search-results";
import { useDebounce } from "@/hooks/use-debounce";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { GLOBAL_SEARCH_PLACEHOLDER } from "@/lib/wiki/global-search-types";
import { cn } from "@/lib/utils";

type GlobalSearchBoxProps = {
  variant?: "hero" | "navbar" | "page";
  sportSlug?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  initialQuery?: string;
  query?: string;
  onQueryChange?: (value: string) => void;
  showInlineResults?: boolean;
};

function searchPageHref(query: string) {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

export function GlobalSearchBox({
  variant = "hero",
  sportSlug,
  placeholder = GLOBAL_SEARCH_PLACEHOLDER,
  className,
  inputClassName,
  autoFocus,
  initialQuery = "",
  query: controlledQuery,
  onQueryChange,
  showInlineResults = variant !== "page",
}: GlobalSearchBoxProps) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalQuery, setInternalQuery] = useState(initialQuery);
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isError, isFetching } = useGlobalSearch({
    query: debouncedQuery,
    sportSlug,
    limit: variant === "page" ? 20 : 5,
    enabled: showInlineResults && open && debouncedQuery.trim().length >= 2,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (controlledQuery === undefined) {
      setInternalQuery(initialQuery);
    }
  }, [controlledQuery, initialQuery]);

  const syncDropdownPosition = useCallback(() => {
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!showInlineResults || !open) return;
    syncDropdownPosition();
  }, [showInlineResults, open, query, debouncedQuery, syncDropdownPosition]);

  useEffect(() => {
    if (!showInlineResults || !open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const portal = document.getElementById(listboxId);
      if (portal?.contains(target)) return;
      setOpen(false);
    }

    function onReposition() {
      syncDropdownPosition();
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [showInlineResults, open, listboxId, syncDropdownPosition]);

  const submitSearch = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setOpen(false);
    router.push(searchPageHref(trimmed));
  };

  const isHero = variant === "hero";
  const isPage = variant === "page";
  const isNavbar = variant === "navbar";
  const showDropdown =
    mounted &&
    showInlineResults &&
    open &&
    debouncedQuery.trim().length >= 2 &&
    dropdownRect;

  const dropdownPanel = showDropdown ? (
    <div
      id={listboxId}
      role="listbox"
      style={{
        position: "fixed",
        top: dropdownRect.top,
        left: dropdownRect.left,
        width: Math.max(dropdownRect.width, isNavbar ? 280 : dropdownRect.width),
        zIndex: 140,
      }}
      className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-2xl ring-1 ring-black/5"
    >
      <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2">
        <GlobalSearchResults
          results={data?.results ?? []}
          query={debouncedQuery}
          isLoading={isLoading || isFetching}
          isError={isError}
          compact
          onNavigate={() => setOpen(false)}
        />
      </div>
      {(data?.results.length ?? 0) > 0 ? (
        <div className="border-t border-cp-border px-3 py-2">
          <button
            type="button"
            onClick={submitSearch}
            className="w-full rounded-lg py-2 text-xs font-semibold text-cp-primary hover:bg-cp-primary/10"
          >
            View all results for “{debouncedQuery.trim()}”
          </button>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative isolate w-full", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        className={cn(
          "flex w-full gap-2",
          isHero
            ? "flex-col rounded-xl border border-cp-border bg-cp-card/70 p-1.5 backdrop-blur-md sm:flex-row sm:items-center sm:p-2"
            : isPage
              ? "flex-col sm:flex-row sm:items-center"
              : "items-center rounded-lg border border-cp-border bg-cp-bg-input pr-1",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-cp-muted",
              isHero ? "left-3.5 h-4 w-4" : "left-3 h-4 w-4",
            )}
          />
          <input
            type="search"
            value={query}
            autoFocus={autoFocus}
            aria-label="Search wiki"
            aria-expanded={showInlineResults ? open : undefined}
            aria-controls={showInlineResults ? listboxId : undefined}
            aria-autocomplete="list"
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value);
              if (showInlineResults) setOpen(true);
            }}
            onFocus={() => {
              if (showInlineResults && query.trim().length >= 2) setOpen(true);
            }}
            className={cn(
              "w-full rounded-lg bg-transparent text-sm text-foreground placeholder:text-cp-muted focus:outline-none",
              isHero ? "py-2.5 pr-3 pl-10" : "h-9 py-2 pr-3 pl-9",
              inputClassName,
            )}
          />
        </div>
        {!isNavbar ? (
          <button
            type="submit"
            disabled={query.trim().length < 2}
            className={cn(
              "btn-interactive inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-cp-primary font-semibold text-white transition-colors hover:bg-[#0033C0] disabled:cursor-not-allowed disabled:opacity-50",
              isHero
                ? "px-4 py-2.5 text-xs shadow-[0_4px_20px_rgba(0,71,255,0.4)] sm:text-sm"
                : "h-9 px-3 text-xs sm:px-4 sm:text-sm",
            )}
          >
            Search
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={query.trim().length < 2}
            aria-label="Search"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cp-muted transition-colors hover:bg-cp-elevated hover:text-cp-primary disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </form>

      {mounted && dropdownPanel ? createPortal(dropdownPanel, document.body) : null}
    </div>
  );
}
