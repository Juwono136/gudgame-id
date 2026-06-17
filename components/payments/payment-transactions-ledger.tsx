"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Receipt, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { formatIdrDisplay } from "@/lib/format/currency";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { PaymentTransactionRow, TransactionQueryResult } from "@/lib/tournaments/payments/transaction-types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/20 text-emerald-300",
  pending: "bg-amber-500/20 text-amber-300",
  expired: "bg-slate-500/20 text-slate-400",
  failed: "bg-red-500/20 text-red-300",
  refunded: "bg-blue-500/20 text-blue-300",
};

type PaymentTransactionsLedgerProps = {
  apiPath: string;
  scope: "admin" | "host" | "player";
  showHostColumn?: boolean;
  showPlatformFees?: boolean;
  onPayPending?: (row: PaymentTransactionRow) => void;
  pageSize?: number;
};

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function PaymentTransactionsLedger({
  apiPath,
  scope,
  showHostColumn = false,
  showPlatformFees = false,
  onPayPending,
  pageSize = 15,
}: PaymentTransactionsLedgerProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, status]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["payments", "ledger", apiPath, debouncedSearch, status, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (status !== "all") params.set("status", status);

      const res = await fetch(`${apiPath}?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: TransactionQueryResult;
        error?: unknown;
      }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Failed to load transactions"));
      return json.data;
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {data?.summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Collected (paid)" value={formatIdrDisplay(data.summary.totalCollectedIdr)} />
          {showPlatformFees ? (
            <SummaryCard
              label="Platform fees"
              value={formatIdrDisplay(data.summary.totalPlatformFeesIdr)}
            />
          ) : (
            <SummaryCard
              label="Your earnings"
              value={formatIdrDisplay(data.summary.totalHostPayoutIdr)}
            />
          )}
          <SummaryCard label="Paid transactions" value={String(data.summary.paidCount)} />
          <SummaryCard label="Pending" value={String(data.summary.pendingCount)} highlight />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournament, team, invoice, player…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading transactions…" />
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-cp-border py-16 text-center text-sm text-cp-muted">
          No transactions found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cp-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-cp-border bg-cp-elevated/50 text-xs uppercase tracking-wide text-cp-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Tournament</th>
                <th className="px-4 py-3 font-semibold">Team / Player</th>
                {showHostColumn ? (
                  <th className="px-4 py-3 font-semibold">Host</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Amount</th>
                {showPlatformFees ? (
                  <th className="px-4 py-3 font-semibold">Platform</th>
                ) : scope === "host" ? (
                  <th className="px-4 py-3 font-semibold">Your share</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className={cn(isFetching && "opacity-60")}>
              {data.items.map((row) => (
                <tr key={row.paymentId} className="border-b border-cp-border/60 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-cp-muted">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(row.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{row.tournamentName}</p>
                    <p className="text-xs text-cp-muted capitalize">{row.tournamentType}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.teamName ?? "—"}</p>
                    <p className="text-xs text-cp-muted">{row.payerName ?? "Player"}</p>
                  </td>
                  {showHostColumn ? (
                    <td className="px-4 py-3 text-cp-muted">{row.hostName ?? "—"}</td>
                  ) : null}
                  <td className="px-4 py-3 font-semibold">{formatIdrDisplay(row.amountIdr)}</td>
                  {showPlatformFees ? (
                    <td className="px-4 py-3 text-cp-muted">
                      {formatIdrDisplay(row.platformFeeIdr)}
                    </td>
                  ) : scope === "host" ? (
                    <td className="px-4 py-3 text-emerald-400">
                      {formatIdrDisplay(row.hostPayoutIdr)}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 capitalize",
                        STATUS_STYLES[row.status] ?? "bg-cp-elevated",
                      )}
                    >
                      {row.status}
                    </Badge>
                    {row.paymentMethod ? (
                      <p className="mt-1 text-[10px] uppercase text-cp-muted">{row.paymentMethod}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.status === "pending" && scope === "player" && onPayPending ? (
                      <Button size="sm" className="bg-cp-primary" onClick={() => onPayPending(row)}>
                        <Receipt className="mr-1 h-3.5 w-3.5" />
                        Pay
                      </Button>
                    ) : (
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={publicSportRoutes.tournament(row.sportSlug, row.tournamentSlug)}
                        >
                          View
                        </Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-cp-muted">
            Page {page + 1} of {totalPages} · {data?.total ?? 0} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-cp-border bg-cp-card p-4">
      <p className="text-xs uppercase tracking-wide text-cp-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold",
          highlight ? "text-amber-400" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
