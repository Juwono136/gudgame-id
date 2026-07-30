"use client";

import { useEffect, useMemo, useState } from "react";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import { PartnerDirectoryToolbar } from "@/components/partners/partner-directory-toolbar";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import type { PartnerLeagueMatchView } from "@/lib/partners/league-types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type PartnerLeagueMatchesPanelProps = {
  matches: PartnerLeagueMatchView[];
  /** When set, show Enter/Edit score actions (manage mode). */
  onEditScore?: (match: PartnerLeagueMatchView) => void;
  /** Public results list defaults to completed-only. Manage shows all. */
  defaultStatus?: "all" | "scheduled" | "completed" | "cancelled";
  className?: string;
};

export function PartnerLeagueMatchesPanel({
  matches,
  onEditScore,
  defaultStatus = "all",
  className,
}: PartnerLeagueMatchesPanelProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState(defaultStatus);
  const [sortBy, setSortBy] = useState<"playedAt" | "teams">("playedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sortBy, sortDir]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let rows = matches.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (!q) return true;
      return (
        m.teamAName.toLowerCase().includes(q) ||
        m.teamBName.toLowerCase().includes(q)
      );
    });

    const mul = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (sortBy === "teams") {
        return mul * `${a.teamAName}${a.teamBName}`.localeCompare(`${b.teamAName}${b.teamBName}`);
      }
      const aTime = a.playedAt ? Date.parse(a.playedAt) : 0;
      const bTime = b.playedAt ? Date.parse(b.playedAt) : 0;
      return mul * (aTime - bTime);
    });
    return rows;
  }, [matches, debouncedSearch, status, sortBy, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  return (
    <div className={cn("space-y-4", className)}>
      <PartnerDirectoryToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search teams…"
        status={status}
        onStatusChange={(v) =>
          setStatus(v as "all" | "scheduled" | "completed" | "cancelled")
        }
        statusOptions={[
          { value: "all", label: "All matches" },
          { value: "scheduled", label: "Scheduled" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        sortBy={sortBy}
        onSortByChange={(v) => setSortBy(v as "playedAt" | "teams")}
        sortOptions={[
          { value: "playedAt", label: "Played date" },
          { value: "teams", label: "Team names" },
        ]}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
      />

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
        {pageItems.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-cp-muted sm:px-5">
            {debouncedSearch || status !== defaultStatus
              ? "No matching matches."
              : "No matches yet."}
          </p>
        ) : (
          <ul className="divide-y divide-cp-border">
            {pageItems.map((match) => (
              <li
                key={match.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {match.teamAName}{" "}
                    <span className="text-cp-muted">vs</span> {match.teamBName}
                  </p>
                  <p className="mt-0.5 text-xs text-cp-muted">
                    {match.status === "completed"
                      ? `${match.scoreA} – ${match.scoreB}`
                      : match.status === "cancelled"
                        ? "Cancelled"
                        : "Awaiting score"}
                  </p>
                </div>
                {onEditScore ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={match.status === "completed" ? "outline" : "default"}
                    className={
                      match.status === "completed"
                        ? "border-cp-border"
                        : "bg-cp-primary hover:bg-cp-primary-light"
                    }
                    onClick={() => onEditScore(match)}
                  >
                    {match.status === "completed" ? "Edit score" : "Enter score"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CompetitionListPagination
        page={pageSafe}
        totalPages={total === 0 ? 0 : totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
