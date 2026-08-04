"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Search, Trophy } from "lucide-react";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import { DirectoryViewToggle } from "@/components/partners/directory-view-toggle";
import { PartnerDashboardCardActions } from "@/components/partners/partner-dashboard-card-actions";
import { PartnerTournamentPublicListRow } from "@/components/partners/partner-tournament-public-list-row";
import { PartnerTournamentRow } from "@/components/partners/partner-tournament-row";
import { TournamentDiscoveryCard } from "@/components/tournaments/tournament-discovery-card";
import { TournamentDiscoveryPublicCard } from "@/components/tournaments/tournament-discovery-public-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useDirectoryViewMode } from "@/hooks/use-directory-view-mode";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import type { TournamentListItem } from "@/lib/tournaments/service";

type ListResponse = {
  items: TournamentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PartnerLeagueTournamentsSectionProps = {
  partnerSlug: string;
  leagueId: string;
  leagueName: string;
  mode: "public" | "dashboard";
  /** First page for SSR / hydration. */
  initialItems?: TournamentListItem[];
  initialTotal?: number;
  /** Report total count to parent (e.g. banner meta). */
  onTotalChange?: (total: number) => void;
};

export function PartnerLeagueTournamentsSection({
  partnerSlug,
  leagueId,
  leagueName,
  mode,
  initialItems = [],
  initialTotal = 0,
  onTotalChange,
}: PartnerLeagueTournamentsSectionProps) {
  const [viewMode, setViewMode] = useDirectoryViewMode(
    `partner-league-tournaments-${mode}`,
    "list",
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, leagueId]);

  const queryKey = useMemo(
    () =>
      [
        "partner-league-tournaments",
        mode,
        partnerSlug,
        leagueId,
        page,
        debouncedSearch.trim(),
      ] as const,
    [mode, partnerSlug, leagueId, page, debouncedSearch],
  );

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey,
    queryFn: async (): Promise<ListResponse> => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
        status: "all",
        leagueId,
        sortBy: "startsAt",
        sortDir: "asc",
      });
      const q = debouncedSearch.trim();
      if (q) params.set("search", q);

      const url =
        mode === "public"
          ? `/api/partner/public/${encodeURIComponent(partnerSlug)}/tournaments?${params}`
          : `/api/partner/tournaments?${params}`;

      const res = await fetch(url);
      const json = await parseJsonResponse<{ success: true; data: ListResponse }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not load tournaments",
        );
      }
      return json.data;
    },
    initialData:
      page === 1 && !debouncedSearch.trim()
        ? {
            items: initialItems,
            total: initialTotal,
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            totalPages:
              initialTotal <= 0 ? 0 : Math.ceil(initialTotal / DEFAULT_PAGE_SIZE),
          }
        : undefined,
    placeholderData: (prev) => prev,
  });

  const tournaments = data?.items ?? [];
  const total = data?.total ?? initialTotal;
  const totalPages = data?.totalPages ?? 0;

  useEffect(() => {
    onTotalChange?.(total);
  }, [total, onTotalChange]);

  const newTournamentHref = `${dashboardRoutes.partnerTournamentsNew}?leagueId=${encodeURIComponent(leagueId)}`;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">Tournaments</h2>
          <p className="mt-0.5 text-xs text-cp-muted sm:text-sm">
            Events under {leagueName}
            {total ? ` · ${total}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {total > 0 || search ? (
            <DirectoryViewToggle value={viewMode} onChange={setViewMode} />
          ) : null}
          {mode === "dashboard" ? (
            <Button asChild size="sm" className="bg-cp-primary hover:bg-cp-primary-light">
              <Link href={newTournamentHref}>
                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                New tournament
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {total > 0 || search || debouncedSearch ? (
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cp-muted"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournaments…"
            className="border-cp-border bg-cp-elevated/40 pl-9"
            aria-label="Search tournaments in this league"
          />
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className="rounded-2xl border border-cp-border bg-cp-card px-4 py-10 text-center text-sm text-cp-muted">
          Loading tournaments…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-cp-card px-4 py-8 text-center text-sm text-destructive">
          Could not load tournaments. Try refreshing the page.
        </div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 px-4 py-10 text-center sm:px-6">
          <Trophy className="mx-auto h-8 w-8 text-cp-primary/50" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">
            {debouncedSearch.trim()
              ? "No tournaments match your search"
              : "No tournaments in this league yet"}
          </p>
          <p className="mt-1 text-sm text-cp-muted">
            {debouncedSearch.trim()
              ? "Try a different name or clear the search."
              : mode === "dashboard"
                ? "Create a tournament and this league will be pre-selected, or attach an existing event from the tournament editor."
                : "When events are published under this league, they appear here."}
          </p>
          {mode === "dashboard" && !debouncedSearch.trim() ? (
            <Button asChild className="mt-4 bg-cp-primary hover:bg-cp-primary-light">
              <Link href={newTournamentHref}>Create tournament</Link>
            </Button>
          ) : mode === "public" && !debouncedSearch.trim() ? (
            <Button asChild variant="outline" className="mt-4 border-cp-border">
              <Link href={partnerPublicRoutes.tournaments(partnerSlug)}>
                Browse all tournaments
              </Link>
            </Button>
          ) : null}
        </div>
      ) : viewMode === "list" ? (
        <ul className="space-y-2.5 sm:space-y-3">
          {tournaments.map((t) =>
            mode === "public" ? (
              <PartnerTournamentPublicListRow
                key={t.id}
                tournament={t}
                partnerSlug={partnerSlug}
                hideLeagueBadge
              />
            ) : (
              <PartnerTournamentRow
                key={t.id}
                tournament={t}
                href={partnerPublicRoutes.tournament(partnerSlug, t.slug)}
                publicHref={partnerPublicRoutes.tournament(partnerSlug, t.slug)}
                manageHref={partnerPublicRoutes.tournamentManage(partnerSlug, t.slug)}
                hideLeagueBadge
                editHref={
                  t.status === "completed" || t.status === "cancelled"
                    ? undefined
                    : dashboardRoutes.partnerTournamentEdit(t.id)
                }
              />
            ),
          )}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {tournaments.map((t, index) => {
            const publicHref = partnerPublicRoutes.tournament(partnerSlug, t.slug);
            const registerHref = partnerPublicRoutes.tournamentRegister(partnerSlug, t.slug);
            if (mode === "public") {
              return (
                <TournamentDiscoveryPublicCard
                  key={t.id}
                  tournament={{ ...t, partnerLeagueName: null }}
                  detailHref={publicHref}
                  registerHref={registerHref}
                  partnerSlug={partnerSlug}
                  priority={index === 0}
                />
              );
            }
            const manageHref = partnerPublicRoutes.tournamentManage(partnerSlug, t.slug);
            const canEdit = t.status !== "completed" && t.status !== "cancelled";
            return (
              <TournamentDiscoveryCard
                key={t.id}
                tournament={{ ...t, partnerLeagueName: null }}
                href={manageHref}
                priority={index === 0}
                actions={
                  <PartnerDashboardCardActions
                    manageHref={manageHref}
                    publicHref={publicHref}
                    editHref={
                      canEdit ? dashboardRoutes.partnerTournamentEdit(t.id) : undefined
                    }
                  />
                }
              />
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <CompetitionListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setPage}
          disabled={isFetching}
        />
      ) : null}
    </section>
  );
}
