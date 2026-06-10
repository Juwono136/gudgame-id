"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Search, Trash2, Trophy } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import { useDebounce } from "@/hooks/use-debounce";
import { useDeleteManageTournament } from "@/hooks/use-manage-tournament";
import { usePlayerTournamentsList } from "@/hooks/use-player-competition";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { Badge } from "@/components/ui/badge";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PlayerTournamentsListQuery } from "@/lib/validations/player-competition";
import { cn } from "@/lib/utils";

type PlayerTournamentsListPageProps = {
  roles: AppRole[];
};

function placementTone(placement: string) {
  const lower = placement.toLowerCase();
  if (lower.includes("winner") || lower.includes("champion")) {
    return "text-cp-primary";
  }
  if (lower.includes("finalist") || lower.includes("runner")) {
    return "text-amber-400";
  }
  return "text-foreground";
}

export function PlayerTournamentsListPage({ roles }: PlayerTournamentsListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopeParam = searchParams.get("scope");
  const scope: PlayerTournamentsListQuery["scope"] =
    scopeParam === "joined" || scopeParam === "all" ? scopeParam : "created";

  const { confirm } = useConfirmDialog();
  const deleteTournament = useDeleteManageTournament();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [year, setYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<PlayerTournamentsListQuery["sortBy"]>("year");
  const [sortDir, setSortDir] = useState<PlayerTournamentsListQuery["sortDir"]>("desc");

  const queryParams: PlayerTournamentsListQuery = useMemo(
    () => ({
      page,
      pageSize: 10,
      scope,
      search: debouncedSearch || undefined,
      year: year === "all" ? undefined : Number(year),
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, year, sortBy, sortDir, scope],
  );

  const { data, isLoading, isFetching, error } = usePlayerTournamentsList(queryParams, {
    includeYears: true,
  });

  const yearOptions = data?.years ?? [];

  const scopeTabs: { id: PlayerTournamentsListQuery["scope"]; label: string; hint: string }[] = [
    {
      id: "created",
      label: "Sessions host",
      hint: "Tournaments and reclub sessions you created",
    },
    {
      id: "joined",
      label: "Sessions joined",
      hint: "Events you participated in as a player",
    },
  ];

  const activeTab = scopeTabs.find((t) => t.id === scope);

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title={scope === "created" ? "Sessions you host" : "Sessions you joined"}
      description={activeTab?.hint}
      breadcrumbs={[
        { label: "Player", href: dashboardRoutes.home },
        { label: "Tournaments" },
      ]}
      actions={
        scope === "created" ? (
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500">
            <Link href={dashboardRoutes.tournamentsNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create reclub
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {scopeTabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={scope === tab.id ? "default" : "outline"}
            className={cn(
              scope === tab.id
                ? "bg-cp-primary hover:bg-cp-primary-light"
                : "border-cp-border",
            )}
            onClick={() => {
              setPage(1);
              router.push(`${dashboardRoutes.tournaments}?scope=${tab.id}`);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tournament, category, or placement…"
              className="h-10 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2">
            <Select
              value={year}
              onValueChange={(v) => {
                setYear(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={`${sortBy}-${sortDir}`}
              onValueChange={(v) => {
                const [sb, sd] = v.split("-") as [
                  PlayerTournamentsListQuery["sortBy"],
                  PlayerTournamentsListQuery["sortDir"],
                ];
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year-desc">Year (newest)</SelectItem>
                <SelectItem value="year-asc">Year (oldest)</SelectItem>
                <SelectItem value="tournament-asc">Tournament (A–Z)</SelectItem>
                <SelectItem value="tournament-desc">Tournament (Z–A)</SelectItem>
                <SelectItem value="placement-asc">Placement (best)</SelectItem>
                <SelectItem value="placement-desc">Placement (worst)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative overflow-hidden">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load tournaments"}
            </div>
          ) : isLoading ? (
            <CompetitionListSkeleton />
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <Trophy className="h-10 w-10 text-cp-text-dim" />
              <p className="text-sm font-medium text-foreground">No tournaments found</p>
              <p className="max-w-md text-xs text-cp-muted">
                {search || year !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create a reclub session or join one — it will appear here. Official placements sync after ranked events."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden border-b border-cp-border bg-cp-elevated/50 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:grid sm:grid-cols-[72px_1.2fr_88px_1fr_120px_88px] sm:gap-3 sm:text-xs">
                <span>Year</span>
                <span>Tournament</span>
                <span>Type</span>
                <span>Category</span>
                <span className="text-right">Role / placement</span>
                <span className="text-right">Actions</span>
              </div>

              <ul className="divide-y divide-cp-border">
                {data?.items.map((row) => {
                  const href =
                    row.sportSlug && row.slug
                      ? publicSportRoutes.tournament(row.sportSlug, row.slug)
                      : null;
                  return (
                    <li
                      key={row.id}
                      className="grid gap-2 px-4 py-4 sm:grid-cols-[72px_1.2fr_88px_1fr_120px_88px] sm:items-center sm:gap-3 sm:px-6"
                    >
                      <p className="text-sm font-semibold text-foreground">{row.year}</p>
                      <div className="min-w-0">
                        {href ? (
                          <Link
                            href={href}
                            className="text-sm font-medium text-foreground hover:text-emerald-400 hover:underline"
                          >
                            {row.tournamentName}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-foreground">{row.tournamentName}</p>
                        )}
                        {row.status ? (
                          <p className="text-xs capitalize text-cp-muted">{row.status}</p>
                        ) : null}
                      </div>
                      <Badge
                        className={cn(
                          "w-fit border-0 text-[10px] uppercase",
                          row.source === "recreational"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-cp-primary/15 text-cp-primary",
                        )}
                      >
                        {row.source === "recreational" ? "Reclub" : "Official"}
                      </Badge>
                      <p className="text-sm text-cp-muted">{row.category ?? "—"}</p>
                      <p
                        className={cn(
                          "text-sm font-semibold sm:text-right",
                          placementTone(row.placement),
                        )}
                      >
                        {row.placement}
                      </p>
                      <div className="flex justify-end gap-1 sm:col-start-6">
                        {row.canEdit && row.tournamentId ? (
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-cp-muted hover:text-foreground"
                          >
                            <Link
                              href={dashboardRoutes.tournamentEdit(row.tournamentId)}
                              title="Edit tournament"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                        {row.canDelete && row.tournamentId ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                            disabled={deleteTournament.isPending}
                            title="Delete tournament"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Delete tournament?",
                                description:
                                  "This cannot be undone. Tournaments with paid registrations or active brackets cannot be deleted.",
                                confirmLabel: "Delete",
                                cancelLabel: "Cancel",
                                variant: "destructive",
                              });
                              if (ok && row.tournamentId) {
                                deleteTournament.mutate(row.tournamentId);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {data ? (
          <CompetitionListPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            disabled={isFetching}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </DashboardWorkspaceShell>
  );
}
