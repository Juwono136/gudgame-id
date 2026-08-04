"use client";

import { CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ADMIN_DASHBOARD_MAX_CUSTOM_DAYS,
  ADMIN_DASHBOARD_PRESET_RANGES,
  type AdminDashboardRange,
} from "@/lib/validations/admin-dashboard";

const RANGE_LABELS: Record<AdminDashboardRange, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  custom: "Date",
};

const RANGE_HINTS: Record<AdminDashboardRange, string> = {
  week: "7 days",
  month: "30 days",
  year: "12 months",
  custom: "Custom",
};

type AdminRangeFilterProps = {
  value: AdminDashboardRange;
  from: string;
  to: string;
  onRangeChange: (range: AdminDashboardRange) => void;
  onCustomChange: (next: { from: string; to: string }) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  disabled?: boolean;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function AdminRangeFilter({
  value,
  from,
  to,
  onRangeChange,
  onCustomChange,
  onRefresh,
  refreshing,
  disabled,
}: AdminRangeFilterProps) {
  const max = todayIso();
  const minBound = daysAgoIso(ADMIN_DASHBOARD_MAX_CUSTOM_DAYS);

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="grid w-full grid-cols-4 gap-1 rounded-2xl border border-cp-border bg-cp-bg/70 p-1 shadow-sm sm:w-auto sm:inline-grid"
          role="tablist"
          aria-label="Dashboard time range"
        >
          {ADMIN_DASHBOARD_PRESET_RANGES.map((range) => {
            const active = value === range;
            return (
              <button
                key={range}
                type="button"
                role="tab"
                aria-selected={active}
                title={RANGE_HINTS[range]}
                disabled={disabled}
                onClick={() => {
                  if (range === "custom" && (!from || !to)) {
                    onCustomChange({ from: daysAgoIso(29), to: todayIso() });
                  }
                  onRangeChange(range);
                }}
                className={cn(
                  "relative flex min-h-10 flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all duration-200 sm:min-w-[4.5rem] sm:px-3",
                  active
                    ? "bg-cp-primary text-primary-foreground shadow-md shadow-cp-primary/25"
                    : "text-cp-muted hover:bg-cp-elevated hover:text-foreground",
                  disabled && "cursor-not-allowed opacity-55",
                )}
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-bold sm:text-xs">
                  {range === "custom" ? <CalendarDays className="h-3 w-3" /> : null}
                  {RANGE_LABELS[range]}
                </span>
                <span
                  className={cn(
                    "mt-0.5 hidden text-[9px] font-medium sm:block",
                    active ? "text-primary-foreground/80" : "text-cp-text-dim",
                  )}
                >
                  {RANGE_HINTS[range]}
                </span>
              </button>
            );
          })}
        </div>

        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 shrink-0 border-cp-border bg-cp-card font-semibold"
            disabled={disabled || refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        ) : null}
      </div>

      {value === "custom" ? (
        <div className="rounded-2xl border border-dashed border-cp-primary/30 bg-cp-primary/5 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="admin-dash-from" className="text-[11px] font-semibold uppercase tracking-wide text-cp-muted">
                From
              </Label>
              <Input
                id="admin-dash-from"
                type="date"
                value={from}
                min={minBound}
                max={to || max}
                disabled={disabled}
                onChange={(e) => onCustomChange({ from: e.target.value, to })}
                className="h-10 border-cp-border bg-cp-card [color-scheme:light] dark:[&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <span className="hidden pb-2.5 text-center text-xs font-medium text-cp-muted sm:block">
              to
            </span>
            <div className="space-y-1.5">
              <Label htmlFor="admin-dash-to" className="text-[11px] font-semibold uppercase tracking-wide text-cp-muted">
                To
              </Label>
              <Input
                id="admin-dash-to"
                type="date"
                value={to}
                min={from || minBound}
                max={max}
                disabled={disabled}
                onChange={(e) => onCustomChange({ from, to: e.target.value })}
                className="h-10 border-cp-border bg-cp-card [color-scheme:light] dark:[&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-cp-muted">
            Max {ADMIN_DASHBOARD_MAX_CUSTOM_DAYS} days. Ranges over ~3 months switch charts to monthly buckets for readability.
          </p>
        </div>
      ) : null}
    </div>
  );
}
