"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownToLine,
  CalendarClock,
  Clock,
  Landmark,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { formatIdrDisplay } from "@/lib/format/currency";
import {
  DEFAULT_PAGE_SIZE,
  toOffset,
  toTotalPages,
} from "@/lib/pagination/constants";
import {
  DISBURSEMENT_STATUS_LABELS,
  DISBURSEMENT_STATUS_STYLES,
} from "@/lib/payments/host-payout/disbursement/constants";
import { PAYOUT_SCHEDULE_OPTIONS } from "@/lib/payments/host-payout/constants";
import type {
  HostPayoutDisbursementView,
  HostPayoutSummaryView,
} from "@/lib/payments/host-payout/disbursement/types";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

function formatMetricDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(iso));
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const iconClass = {
    default: "text-cp-muted",
    primary: "text-cp-primary",
    success: "text-emerald-400",
    warning: "text-amber-400",
  }[tone];

  return (
    <div className="flex h-full flex-col rounded-xl border border-cp-border/80 bg-cp-card/70 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cp-border/60 bg-cp-elevated/50">
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-xs">
          {label}
        </p>
      </div>
      <p className="mt-3 break-words text-xl font-bold leading-snug text-foreground lg:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 flex-1 text-xs leading-relaxed text-cp-text-dim">{hint}</p>
      ) : (
        <span className="mt-2 flex-1" aria-hidden />
      )}
    </div>
  );
}

function DisbursementStatusBadge({ item }: { item: HostPayoutDisbursementView }) {
  const statusLabel = DISBURSEMENT_STATUS_LABELS[item.status] ?? item.status;
  const statusStyle = DISBURSEMENT_STATUS_STYLES[item.status] ?? DISBURSEMENT_STATUS_STYLES.pending;

  return (
    <Badge className={cn("border-0 text-[10px] font-semibold uppercase", statusStyle)}>
      {statusLabel}
    </Badge>
  );
}

function DisbursementMobileCard({ item }: { item: HostPayoutDisbursementView }) {
  return (
    <li className="rounded-xl border border-cp-border/70 bg-cp-card/50 p-4 transition-colors hover:bg-cp-elevated/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {formatIdrDisplay(item.amountIdr)}
            </p>
            <DisbursementStatusBadge item={item} />
          </div>
          <p className="text-xs text-cp-muted">
            {item.paymentCount} registration{item.paymentCount === 1 ? "" : "s"} ·{" "}
            {item.maskedAccount}
          </p>
          <p className="text-xs text-cp-text-dim">
            {formatDate(item.completedAt ?? item.createdAt)}
          </p>
          {item.failureReason ? (
            <p className="text-xs leading-relaxed text-red-300/90">{item.failureReason}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-xs text-cp-muted">
          <p>{item.bankAccountHolder}</p>
          <p className="mt-0.5 font-mono text-[11px]">{item.bankCode}</p>
        </div>
      </div>
    </li>
  );
}

function QueryErrorPanel({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
      <p className="mt-3 text-sm font-medium text-foreground">Could not load data</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-red-200/90">{message}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-4 border-cp-border"
        disabled={isRetrying}
        onClick={onRetry}
      >
        <RefreshCw className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")} />
        Try again
      </Button>
    </div>
  );
}

export function HostPayoutDisbursementsCard({
  className,
  embedded = false,
}: {
  className?: string;
  embedded?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErr,
    refetch: refetchSummary,
    isFetching: summaryFetching,
  } = useQuery({
    queryKey: ["host", "payout-summary"],
    queryFn: async () => {
      const res = await fetch("/api/host/payout/disbursements/summary");
      const json = await parseJsonResponse<{
        success: boolean;
        data: { summary: HostPayoutSummaryView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load payout summary"));
      }
      return json.data.summary;
    },
    refetchInterval: 60_000,
  });

  const {
    data: history,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    error: historyErr,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["host", "payout-disbursements", page, pageSize],
    queryFn: async () => {
      const offset = toOffset(page, pageSize);
      const res = await fetch(
        `/api/host/payout/disbursements?limit=${pageSize}&offset=${offset}`,
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: HostPayoutDisbursementView[]; total: number };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load payout history"));
      }
      return json.data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(summary?.bankConfigured),
  });

  const scheduleOption = PAYOUT_SCHEDULE_OPTIONS.find((o) => o.value === summary?.payoutSchedule);
  const scheduleLabel = scheduleOption?.label ?? "Weekly";
  const scheduleHint = scheduleOption?.shortLabel ?? "Every week";
  const totalPages = history ? toTotalPages(history.total, pageSize) : 0;

  if (summaryLoading) {
    return (
      <div className={cn("rounded-2xl border border-cp-border bg-cp-elevated/30 p-6", className)}>
        <LoadingSpinner label="Loading bank payout status…" />
      </div>
    );
  }

  if (summaryError) {
    return (
      <QueryErrorPanel
        message={
          summaryErr instanceof Error ? summaryErr.message : "Failed to load payout summary"
        }
        onRetry={() => void refetchSummary()}
        isRetrying={summaryFetching}
      />
    );
  }

  if (!summary?.bankConfigured) {
    return (
      <div className="rounded-2xl border border-dashed border-cp-border bg-cp-elevated/20 px-4 py-12 text-center">
        <Landmark className="mx-auto h-10 w-10 text-cp-muted" />
        <p className="mt-3 text-sm font-medium text-foreground">Add a payout account first</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-cp-muted">
          Configure at least one bank account under the Payout accounts tab to view scheduled
          transfers and disbursement history.
        </p>
      </div>
    );
  }

  return (
    <section className={cn("space-y-5", className)}>
      {!embedded ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ArrowDownToLine className="h-5 w-5 text-cp-primary" />
              Bank payouts
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cp-muted">
              Earnings from completed registrations are batched and transferred to your primary bank
              on your {scheduleLabel.toLowerCase()} schedule.
            </p>
          </div>
          {summary.isDue ? (
            <Badge className="w-fit border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
              Transfer due
            </Badge>
          ) : null}
        </div>
      ) : summary.isDue ? (
        <div className="flex justify-end">
          <Badge className="w-fit border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            Transfer due
          </Badge>
        </div>
      ) : null}

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          icon={Wallet}
          label="Pending balance"
          value={formatIdrDisplay(summary.pendingBalanceIdr)}
          hint={
            summary.pendingPaymentCount > 0
              ? `${summary.pendingPaymentCount} paid registration${summary.pendingPaymentCount === 1 ? "" : "s"} awaiting transfer`
              : "No earnings waiting for transfer"
          }
          tone="primary"
        />
        <SummaryMetric
          icon={CalendarClock}
          label="Payout schedule"
          value={scheduleLabel}
          hint={scheduleHint}
        />
        <SummaryMetric
          icon={Clock}
          label="Next transfer"
          value={summary.isDue ? "Due now" : formatMetricDate(summary.nextPayoutAt)}
          hint={
            summary.pendingBalanceIdr < summary.minimumDisbursementIdr
              ? `Minimum ${formatIdrDisplay(summary.minimumDisbursementIdr)} to trigger`
              : summary.isDue
                ? "Runs on the next scheduled job (08:00 WIB)"
                : summary.nextPayoutAt
                  ? `Scheduled · ${formatDate(summary.nextPayoutAt)}`
                  : "Based on your last completed payout"
          }
          tone={summary.isDue ? "success" : "default"}
        />
        <SummaryMetric
          icon={Landmark}
          label="Last payout"
          value={
            summary.lastDisbursement
              ? formatIdrDisplay(summary.lastDisbursement.amountIdr)
              : "None yet"
          }
          hint={
            summary.lastDisbursement
              ? formatDate(summary.lastDisbursement.completedAt)
              : "First transfer after earnings accumulate"
          }
          tone={summary.lastDisbursement ? "success" : "default"}
        />
      </div>

      {!summary.xenPlatformLinked ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
          Complete payout setup in your host dashboard to enable automatic bank transfers.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card/40">
        <div className="border-b border-cp-border px-4 py-4 sm:px-5">
          <h3 className="text-sm font-semibold text-foreground">Transfer history</h3>
          <p className="mt-1 text-xs text-cp-muted">
            Completed and in-progress disbursements to your primary bank account.
          </p>
        </div>

        {historyError ? (
          <div className="p-4 sm:p-5">
            <QueryErrorPanel
              message={
                historyErr instanceof Error ? historyErr.message : "Failed to load payout history"
              }
              onRetry={() => void refetchHistory()}
              isRetrying={historyFetching}
            />
          </div>
        ) : historyLoading && !history ? (
          <div className="flex justify-center px-4 py-12">
            <LoadingSpinner label="Loading history…" />
          </div>
        ) : history && history.items.length > 0 ? (
          <>
            <ul
              className={cn(
                "space-y-3 p-4 sm:p-5 lg:hidden",
                historyFetching && "opacity-60",
              )}
            >
              {history.items.map((item) => (
                <DisbursementMobileCard key={item.id} item={item} />
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-cp-border bg-cp-elevated/50 text-xs uppercase tracking-wide text-cp-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Registrations</th>
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-5 py-3 font-semibold">Holder</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className={cn(historyFetching && "opacity-60")}>
                  {history.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-cp-border/60 last:border-0 hover:bg-cp-elevated/20"
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-cp-muted">
                        {formatDate(item.completedAt ?? item.createdAt)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-foreground">
                        {formatIdrDisplay(item.amountIdr)}
                      </td>
                      <td className="px-5 py-3 text-cp-muted">{item.paymentCount}</td>
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs">{item.maskedAccount}</p>
                        <p className="text-[11px] uppercase text-cp-text-dim">{item.bankCode}</p>
                      </td>
                      <td className="px-5 py-3 text-cp-muted">{item.bankAccountHolder}</td>
                      <td className="px-5 py-3">
                        <DisbursementStatusBadge item={item} />
                        {item.failureReason ? (
                          <p className="mt-1 max-w-xs text-xs leading-relaxed text-red-300/90">
                            {item.failureReason}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              page={page}
              pageSize={pageSize}
              total={history.total}
              totalPages={totalPages}
              disabled={historyFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        ) : (
          <div className="px-4 py-12 text-center sm:px-5">
            <Landmark className="mx-auto h-8 w-8 text-cp-muted" />
            <p className="mt-3 text-sm font-medium text-foreground">No bank transfers yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-cp-muted">
              When your schedule is due and pending earnings meet the minimum threshold, funds are
              sent automatically to your primary account.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
