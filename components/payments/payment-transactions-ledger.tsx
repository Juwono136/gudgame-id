"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, FileText, Receipt, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
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
import { PaymentInvoiceDialog } from "@/components/payments/payment-invoice-dialog";
import {
  DEFAULT_PAGE_SIZE,
  toOffset,
  toTotalPages,
} from "@/lib/pagination/constants";
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
  embedded?: boolean;
};

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "paid" | "pending" | "expired" | "failed";
}) {
  const valueClass = {
    default: "text-foreground",
    paid: "text-emerald-600 dark:text-emerald-400",
    pending: "text-amber-600 dark:text-amber-400",
    expired: "text-slate-600 dark:text-slate-400",
    failed: "text-red-600 dark:text-red-400",
  }[tone];

  return (
    <div className="min-w-0 rounded-xl border border-cp-border bg-cp-card p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-xs">
        {label}
      </p>
      <p className={cn("mt-1 truncate text-lg font-bold sm:text-xl", valueClass)}>{value}</p>
    </div>
  );
}

function TransactionRowActions({
  row,
  scope,
  onPayPending,
  onViewReceipt,
}: {
  row: PaymentTransactionRow;
  scope: PaymentTransactionsLedgerProps["scope"];
  onPayPending?: (row: PaymentTransactionRow) => void;
  onViewReceipt?: (row: PaymentTransactionRow) => void;
}) {
  if (row.status === "pending" && scope === "player" && onPayPending) {
    return (
      <Button size="sm" className="h-9 w-full bg-cp-primary sm:w-auto" onClick={() => onPayPending(row)}>
        <Receipt className="mr-1 h-3.5 w-3.5" />
        Pay
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      {row.status === "paid" && onViewReceipt ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 w-full border-cp-border sm:w-auto"
          onClick={() => onViewReceipt(row)}
        >
          <FileText className="mr-1 h-3.5 w-3.5" />
          Receipt
        </Button>
      ) : null}
      <Button asChild variant="ghost" size="sm" className="h-9 w-full sm:w-auto">
        <Link href={publicSportRoutes.tournament(row.sportSlug, row.tournamentSlug)}>View</Link>
      </Button>
    </div>
  );
}

function TransactionLedgerCard({
  row,
  scope,
  showHostColumn,
  showPlatformFees,
  onPayPending,
  onViewReceipt,
}: {
  row: PaymentTransactionRow;
  scope: PaymentTransactionsLedgerProps["scope"];
  showHostColumn: boolean;
  showPlatformFees: boolean;
  onPayPending?: (row: PaymentTransactionRow) => void;
  onViewReceipt?: (row: PaymentTransactionRow) => void;
}) {
  const dateStr = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(row.createdAt));

  const shareLabel = showPlatformFees ? "Platform fee" : scope === "host" ? "Your share" : null;
  const shareValue = showPlatformFees
    ? formatIdrDisplay(row.platformFeeIdr)
    : scope === "host"
      ? formatIdrDisplay(row.hostPayoutIdr)
      : null;

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{row.tournamentName}</p>
            <p className="mt-0.5 text-xs capitalize text-cp-muted">{row.tournamentType}</p>
          </div>
          <Badge
            className={cn(
              "shrink-0 border-0 capitalize",
              STATUS_STYLES[row.status] ?? "bg-cp-elevated",
            )}
          >
            {row.status}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Team / player
            </dt>
            <dd className="mt-0.5 text-sm text-foreground">{row.teamName ?? "—"}</dd>
            <dd className="text-xs text-cp-muted">{row.payerName ?? "Player"}</dd>
          </div>
          {showHostColumn ? (
            <div className="col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                Host
              </dt>
              <dd className="mt-0.5 text-sm text-cp-muted">{row.hostName ?? "—"}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Date
            </dt>
            <dd className="mt-0.5 text-sm text-cp-muted">{dateStr}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              Amount
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {formatIdrDisplay(row.amountIdr)}
            </dd>
          </div>
          {shareLabel && shareValue ? (
            <div className="col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                {shareLabel}
              </dt>
              <dd
                className={cn(
                  "mt-0.5 text-sm font-semibold",
                  scope === "host" ? "text-emerald-400" : "text-cp-muted",
                )}
              >
                {shareValue}
              </dd>
            </div>
          ) : null}
          {row.paymentMethod ? (
            <div className="col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                Method
              </dt>
              <dd className="mt-0.5 text-xs uppercase text-cp-muted">{row.paymentMethod}</dd>
            </div>
          ) : null}
        </dl>

        <div className="border-t border-cp-border/60 pt-3">
          <TransactionRowActions
            row={row}
            scope={scope}
            onPayPending={onPayPending}
            onViewReceipt={onViewReceipt}
          />
        </div>
      </div>
    </li>
  );
}

export function PaymentTransactionsLedger({
  apiPath,
  scope,
  showHostColumn = false,
  showPlatformFees = false,
  onPayPending,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  embedded = false,
}: PaymentTransactionsLedgerProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [invoicePaymentId, setInvoicePaymentId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, pageSize]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["payments", "ledger", apiPath, debouncedSearch, status, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(toOffset(page, pageSize)),
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
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? toTotalPages(data.total, pageSize) : 0;

  const handleViewReceipt = (row: PaymentTransactionRow) => {
    setInvoicePaymentId(row.paymentId);
  };

  return (
    <div className="space-y-4">
      <PaymentInvoiceDialog
        paymentId={invoicePaymentId}
        open={invoicePaymentId != null}
        onOpenChange={(open) => {
          if (!open) setInvoicePaymentId(null);
        }}
      />

      {!embedded ? (
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Receipt className="h-5 w-5 text-cp-primary" />
          Payment ledger
        </h2>
      ) : null}

      {data?.summary ? (
        scope === "player" ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <SummaryCard label="Paid" value={String(data.summary.paidCount)} tone="paid" />
            <SummaryCard label="Pending" value={String(data.summary.pendingCount)} tone="pending" />
            <SummaryCard label="Expired" value={String(data.summary.expiredCount)} tone="expired" />
            <SummaryCard label="Failed" value={String(data.summary.failedCount)} tone="failed" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Collected (paid)"
              value={formatIdrDisplay(data.summary.totalCollectedIdr)}
            />
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
            <SummaryCard label="Paid transactions" value={String(data.summary.paidCount)} tone="paid" />
            <SummaryCard
              label="Pending"
              value={String(data.summary.pendingCount)}
              tone="pending"
            />
          </div>
        )
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:p-5 md:flex-row md:items-stretch md:gap-4">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50 md:w-44 md:shrink-0">
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
          <div className="flex justify-center px-4 py-12 sm:py-16">
            <LoadingSpinner label="Loading transactions…" />
          </div>
        ) : isError ? (
          <div className="px-4 py-12 text-center sm:py-16">
            <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
            <p className="mt-3 text-sm font-medium text-foreground">Could not load transactions</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-red-200/90">
              {error instanceof Error ? error.message : "Something went wrong"}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4 border-cp-border"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
              Try again
            </Button>
          </div>
        ) : !data?.items.length ? (
          <div className="px-4 py-12 text-center text-sm text-cp-muted sm:py-16">
            No transactions found.
          </div>
        ) : (
          <>
            <ul className={cn("divide-y divide-cp-border lg:hidden", isFetching && "opacity-60")}>
              {data.items.map((row) => (
                <TransactionLedgerCard
                  key={row.paymentId}
                  row={row}
                  scope={scope}
                  showHostColumn={showHostColumn}
                  showPlatformFees={showPlatformFees}
                  onPayPending={onPayPending}
                  onViewReceipt={handleViewReceipt}
                />
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
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
                          <p className="mt-1 text-[10px] uppercase text-cp-muted">
                            {row.paymentMethod}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TransactionRowActions
                          row={row}
                          scope={scope}
                          onPayPending={onPayPending}
                          onViewReceipt={handleViewReceipt}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data && data.total > 0 ? (
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            totalPages={totalPages}
            disabled={isFetching}
            onPageChange={setPage}
            onPageSizeChange={(size) => setPageSize(size)}
          />
        ) : null}
      </div>
    </div>
  );
}
