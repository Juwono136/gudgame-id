"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, Pencil, Plus, Search, Trash2, Trophy } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { OfficialRegistrationEditDialog } from "@/components/tournaments/official-registration-edit-dialog";
import { OfficialRegistrationManageActions } from "@/components/tournaments/official-registration-manage-actions";
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
import type { PlayerTournamentListItem } from "@/lib/account/player-competition/types";
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

const TOURNAMENT_LIST_GRID =
  "md:grid md:grid-cols-[3.25rem_minmax(0,1.5fr)_5.25rem_minmax(0,1fr)_6.5rem_minmax(7.5rem,auto)] md:items-center md:gap-x-3 md:gap-y-1";

type TournamentListRowProps = {
  row: PlayerTournamentListItem;
  scope: PlayerTournamentsListQuery["scope"];
  deletePending: boolean;
  onEditRegistration: (payload: {
    registrationId: string;
    sportSlug: string;
    slug: string;
    tournamentName: string;
  }) => void;
  onRefetch: () => void;
  onDelete: (tournamentId: string) => void;
};

function TournamentListRow({
  row,
  scope,
  deletePending,
  onEditRegistration,
  onRefetch,
  onDelete,
}: TournamentListRowProps) {
  const href =
    scope === "created" && row.tournamentId
      ? dashboardRoutes.tournament(row.tournamentId)
      : row.sportSlug && row.slug
        ? publicSportRoutes.tournament(row.sportSlug, row.slug)
        : null;

  const statusLabel = row.registrationStatus
    ? row.registrationStatus.replace(/_/g, " ")
    : row.status;

  const registrationActions =
    scope === "joined" &&
    row.source === "official" &&
    row.canManageRegistration &&
    row.registrationId &&
    row.registrationStatus &&
    row.sportSlug &&
    row.slug ? (
      <OfficialRegistrationManageActions
        registrationId={row.registrationId}
        sportSlug={row.sportSlug}
        slug={row.slug}
        teamName={row.registrationTeamName}
        registrationStatus={row.registrationStatus}
        layout="compact"
        onEditTeam={() => {
          onEditRegistration({
            registrationId: row.registrationId!,
            sportSlug: row.sportSlug!,
            slug: row.slug!,
            tournamentName: row.tournamentName,
          });
        }}
        onCancelled={() => void onRefetch()}
        redirectOnCancel={undefined}
      />
    ) : null;

  const isReclubCreated =
    scope === "created" && row.source === "recreational" && Boolean(row.tournamentId);

  const hostActions = (
    <>
      {isReclubCreated ? (
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
        >
          <Link
            href={dashboardRoutes.tournament(row.tournamentId!)}
            title="Open session workspace"
            aria-label="Open session workspace"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      {row.canEdit && row.tournamentId ? (
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-cp-muted hover:text-foreground"
        >
          <Link href={dashboardRoutes.tournamentEdit(row.tournamentId)} title="Edit tournament">
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      {row.canDelete && row.tournamentId ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-400 hover:text-red-300"
          disabled={deletePending}
          title="Delete tournament"
          onClick={() => onDelete(row.tournamentId!)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </>
  );

  const typeBadge = (
    <Badge
      className={cn(
        "w-fit shrink-0 border-0 text-[10px] uppercase",
        row.source === "recreational"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-cp-primary/15 text-cp-primary",
      )}
    >
      {row.source === "recreational" ? "Reclub" : "Official"}
    </Badge>
  );

  const tournamentTitle = href ? (
    <Link
      href={href}
      className="text-sm font-medium text-foreground hover:text-emerald-400 hover:underline"
    >
      {row.tournamentName}
    </Link>
  ) : (
    <p className="text-sm font-medium text-foreground">{row.tournamentName}</p>
  );

  return (
    <li className="px-4 py-4 sm:px-5 md:px-6">
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {tournamentTitle}
            {statusLabel ? (
              <p className="mt-0.5 text-xs capitalize text-cp-muted">{statusLabel}</p>
            ) : null}
          </div>
          {typeBadge}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Year
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">{row.year}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Category
            </dt>
            <dd className="mt-0.5 text-sm text-cp-muted">{row.category ?? "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Role / placement
            </dt>
            <dd className={cn("mt-0.5 text-sm font-semibold", placementTone(row.placement))}>
              {row.placement}
            </dd>
          </div>
        </dl>

        {registrationActions || isReclubCreated || row.canEdit || row.canDelete ? (
          <div className="flex flex-wrap items-center justify-end gap-1 border-t border-cp-border/60 pt-3">
            {registrationActions}
            {hostActions}
          </div>
        ) : null}
      </div>

      <div className={cn("hidden min-w-[44rem]", TOURNAMENT_LIST_GRID)}>
        <p className="text-sm font-semibold tabular-nums text-foreground">{row.year}</p>
        <div className="min-w-0">
          {tournamentTitle}
          {statusLabel ? (
            <p className="mt-0.5 text-xs capitalize text-cp-muted">{statusLabel}</p>
          ) : null}
        </div>
        <div className="flex justify-start">{typeBadge}</div>
        <p className="min-w-0 truncate text-sm text-cp-muted">{row.category ?? "—"}</p>
        <p className={cn("text-right text-sm font-semibold", placementTone(row.placement))}>
          {row.placement}
        </p>
        <div className="flex justify-end gap-0.5">
          {registrationActions}
          {hostActions}
        </div>
      </div>
    </li>
  );
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
  const [editRegistration, setEditRegistration] = useState<{
    registrationId: string;
    sportSlug: string;
    slug: string;
    tournamentName: string;
  } | null>(null);

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

  const { data, isLoading, isFetching, error, refetch } = usePlayerTournamentsList(queryParams, {
    includeYears: true,
  });

  const yearOptions = data?.years ?? [];

  const scopeTabs: { id: PlayerTournamentsListQuery["scope"]; label: string; hint: string }[] = [
    {
      id: "created",
      label: "I host",
      hint: "Reclub sessions and community events you created",
    },
    {
      id: "joined",
      label: "I joined",
      hint: "Tournaments you participated in as a player",
    },
  ];

  const activeTab = scopeTabs.find((t) => t.id === scope);

  const handleDeleteTournament = async (tournamentId: string) => {
    const ok = await confirm({
      title: "Delete tournament?",
      description:
        "This cannot be undone. Tournaments with paid registrations or active brackets cannot be deleted.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (ok) {
      deleteTournament.mutate(tournamentId);
    }
  };

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title={scope === "created" ? "My tournaments" : "Joined tournaments"}
      description={activeTab?.hint}
      breadcrumbs={[
        { label: "Player", href: dashboardRoutes.home },
        { label: "Tournaments" },
      ]}
      actions={
        scope === "created" ? (
          <Button
            asChild
            size="sm"
            className="h-10 w-full bg-emerald-600 hover:bg-emerald-500 md:w-auto"
          >
            <Link href={dashboardRoutes.tournamentsNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create reclub
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {scopeTabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={scope === tab.id ? "default" : "outline"}
            className={cn(
              "h-10 w-full sm:w-auto",
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

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:p-5 md:flex-row md:items-stretch md:gap-4">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tournaments…"
              className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>

          <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:min-w-[17rem] md:shrink-0">
            <Select
              value={year}
              onValueChange={(v) => {
                setYear(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50">
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
              <SelectTrigger className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50">
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

        <div className="relative overflow-x-auto overflow-y-hidden">
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
              <div
                className={cn(
                  "hidden min-w-[44rem] border-b border-cp-border bg-cp-elevated/50 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-cp-muted",
                  TOURNAMENT_LIST_GRID,
                )}
              >
                <span>Year</span>
                <span>Tournament</span>
                <span>Type</span>
                <span>Category</span>
                <span className="text-right">Role / placement</span>
                <span className="text-right">Actions</span>
              </div>

              <ul className="divide-y divide-cp-border">
                {data?.items.map((row) => (
                  <TournamentListRow
                    key={row.id}
                    row={row}
                    scope={scope}
                    deletePending={deleteTournament.isPending}
                    onEditRegistration={setEditRegistration}
                    onRefetch={() => void refetch()}
                    onDelete={handleDeleteTournament}
                  />
                ))}
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

      {editRegistration ? (
        <OfficialRegistrationEditDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditRegistration(null);
          }}
          registrationId={editRegistration.registrationId}
          sportSlug={editRegistration.sportSlug}
          tournamentSlug={editRegistration.slug}
          tournamentName={editRegistration.tournamentName}
          onSaved={() => void refetch()}
        />
      ) : null}
    </DashboardWorkspaceShell>
  );
}
