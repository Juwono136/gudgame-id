"use client";

import { cn } from "@/lib/utils";
import {
  ADMIN_DASHBOARD_RANGES,
  type AdminDashboardRange,
} from "@/lib/validations/admin-dashboard";

const RANGE_LABELS: Record<AdminDashboardRange, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
};

type AdminRangeFilterProps = {
  value: AdminDashboardRange;
  onChange: (range: AdminDashboardRange) => void;
  disabled?: boolean;
};

export function AdminRangeFilter({ value, onChange, disabled }: AdminRangeFilterProps) {
  return (
    <div
      className="inline-flex rounded-xl border border-cp-border bg-cp-elevated/40 p-1"
      role="tablist"
      aria-label="Chart time range"
    >
      {ADMIN_DASHBOARD_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          role="tab"
          aria-selected={value === range}
          disabled={disabled}
          onClick={() => onChange(range)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm",
            value === range
              ? "bg-cp-primary text-primary-foreground shadow-sm"
              : "text-cp-muted hover:text-foreground",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
