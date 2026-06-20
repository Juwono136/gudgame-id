"use client";

import { CalendarClock, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAYOUT_SCHEDULE_OPTIONS,
  type PayoutSchedule,
} from "@/lib/payments/host-payout/constants";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type PayoutScheduleFieldProps = {
  value: PayoutSchedule;
  onChange: (value: PayoutSchedule) => void;
  disabled?: boolean;
  isSaving?: boolean;
  className?: string;
};

export function PayoutScheduleField({
  value,
  onChange,
  disabled = false,
  isSaving = false,
  className,
}: PayoutScheduleFieldProps) {
  const selected = PAYOUT_SCHEDULE_OPTIONS.find((o) => o.value === value);

  return (
    <div
      className={cn(
        "rounded-xl border border-cp-border/80 bg-cp-card/60 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {/* Title block */}
        <div className="flex min-w-0 items-start gap-3 lg:max-w-md lg:flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cp-border/60 bg-cp-primary/10">
            <CalendarClock className="h-5 w-5 text-cp-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-foreground">Payout schedule</p>
              {isSaving ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cp-primary" />
                  Saving…
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-cp-muted">
              How often official tournament earnings are transferred to your primary account.
            </p>
          </div>
        </div>

        {/* Control — fixed width on sm+, right-aligned on large screens */}
        <div className="w-full min-w-0 sm:max-w-xs lg:ml-auto lg:w-72 lg:shrink-0">
          <Label className="sr-only" htmlFor="payout-schedule-select">
            Payout schedule
          </Label>
          <Select
            value={value}
            onValueChange={(v) => onChange(v as PayoutSchedule)}
            disabled={disabled || isSaving}
          >
            <SelectTrigger
              id="payout-schedule-select"
              className={cn(
                cpSelectTriggerClass,
                "h-11 w-full rounded-lg shadow-none",
              )}
              aria-label="Payout schedule"
              aria-describedby={selected ? "payout-schedule-hint" : undefined}
            >
              <SelectValue placeholder="Select schedule">
                {selected?.label ?? "Select schedule"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              className={cn(cpSelectContentClass, "min-w-[var(--radix-select-trigger-width)]")}
              position="popper"
              align="end"
              sideOffset={4}
            >
              {PAYOUT_SCHEDULE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className={cn(cpSelectItemClass, "items-start py-2.5")}
                  textValue={option.label}
                >
                  <span className="flex flex-col gap-0.5 text-left">
                    <span className="font-medium leading-none">{option.label}</span>
                    <span className="text-xs leading-snug text-cp-muted">{option.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected ? (
            <p
              id="payout-schedule-hint"
              className="mt-2 text-xs leading-relaxed text-cp-text-dim sm:hidden"
            >
              {selected.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
